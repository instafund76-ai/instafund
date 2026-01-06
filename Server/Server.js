const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

dotenv.config();
const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, uuidv4() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5242880 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
    cb(allowedMimes.includes(file.mimetype) ? null : new Error('Invalid file'));
  }
});

app.use('/uploads', express.static('uploads'));

mongoose.connect(process.env.MONGODB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB Connected')).catch(err => {
  console.error('❌ MongoDB Error:', err);
  process.exit(1);
});

const kycSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  fullName: String,
  dateOfBirth: Date,
  panNumber: String,
  aadharNumber: String,
  aadharDocument: String,
  panDocument: String,
  selfieImage: String,
  addressProof: String,
  address: String,
  city: String,
  state: String,
  pincode: String,
  kycStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  kycVerifiedAt: Date,
  rejectionReason: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  phone: String,
  password: String,
  accountStatus: { type: String, enum: ['active', 'breached', 'funded'], default: 'active' },
  currentPhase: { type: String, enum: ['task1', 'task2', 'task3'], default: 'task1' },
  initialAmount: Number,
  kycId: mongoose.Schema.Types.ObjectId,
  kycStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  trades: [{
    symbol: String,
    side: String,
    quantity: Number,
    entryPrice: Number,
    exitPrice: Number,
    pnl: Number,
    pnlPercent: Number,
    timestamp: Date,
    broker: String,
    orderId: String
  }],
  currentPnL: { type: Number, default: 0 },
  maxDrawdown: { type: Number, default: 0 },
  dailyDrawdown: { type: Number, default: 0 },
  accountBalance: { type: Number, default: 0 },
  paymentId: String,
  paymentStatus: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  isBreached: { type: Boolean, default: false },
  breachReason: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const KYC = mongoose.model('KYC', kycSchema);

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const Razorpay = require('razorpay');
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'Server running', timestamp: new Date() });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !phone || !password) return res.status(400).json({ error: 'All fields required' });
    if (await User.findOne({ email })) return res.status(400).json({ error: 'Email already exists' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, phone, password: hashedPassword });
    await user.save();
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, token, userId: user._id, message: 'Registration successful' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, token, userId: user._id, user: { name: user.name, email: user.email, currentPhase: user.currentPhase, accountStatus: user.accountStatus, kycStatus: user.kycStatus } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/kyc/status', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user.kycId) return res.json({ kycStatus: 'not_started', message: 'KYC not started' });
    const kyc = await KYC.findById(user.kycId);
    res.json({ success: true, kycStatus: kyc.kycStatus, kyc: { fullName: kyc.fullName, panNumber: kyc.panNumber, aadharNumber: kyc.aadharNumber, kycStatus: kyc.kycStatus, rejectionReason: kyc.rejectionReason, kycVerifiedAt: kyc.kycVerifiedAt } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/kyc/start', authMiddleware, async (req, res) => {
  try {
    const { fullName, dateOfBirth, panNumber, aadharNumber, address, city, state, pincode } = req.body;
    if (!fullName || !dateOfBirth || !panNumber || !aadharNumber) return res.status(400).json({ error: 'Required fields missing' });
    
    const user = await User.findById(req.userId);
    const kyc = new KYC({ userId: user._id, fullName, dateOfBirth: new Date(dateOfBirth), panNumber, aadharNumber, address, city, state, pincode, kycStatus: 'pending' });
    await kyc.save();
    
    user.kycId = kyc._id;
    user.kycStatus = 'pending';
    await user.save();
    
    res.json({ success: true, kycId: kyc._id, message: 'KYC process started. Upload documents next.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/kyc/upload-documents', authMiddleware, upload.fields([
  { name: 'aadharDocument', maxCount: 1 },
  { name: 'panDocument', maxCount: 1 },
  { name: 'selfieImage', maxCount: 1 },
  { name: 'addressProof', maxCount: 1 }
]), async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const kyc = await KYC.findById(user.kycId);
    if (!kyc) return res.status(400).json({ error: 'Start KYC first' });
    
    if (req.files.aadharDocument) kyc.aadharDocument = req.files.aadharDocument[0].path;
    if (req.files.panDocument) kyc.panDocument = req.files.panDocument[0].path;
    if (req.files.selfieImage) kyc.selfieImage = req.files.selfieImage[0].path;
    if (req.files.addressProof) kyc.addressProof = req.files.addressProof[0].path;
    
    kyc.updatedAt = new Date();
    await kyc.save();
    res.json({ success: true, message: 'Documents uploaded successfully', kycStatus: kyc.kycStatus });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/kyc/submit', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const kyc = await KYC.findById(user.kycId);
    if (!kyc || !kyc.aadharDocument || !kyc.panDocument || !kyc.selfieImage) {
      return res.status(400).json({ error: 'All documents required' });
    }
    
    kyc.kycStatus = 'verified';
    kyc.kycVerifiedAt = new Date();
    user.kycStatus = 'verified';
    
    await kyc.save();
    await user.save();
    
    res.json({ success: true, message: 'KYC verified!', kycStatus: kyc.kycStatus });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/payment/create-order', authMiddleware, async (req, res) => {
  try {
    const { amount, accountType } = req.body;
    const user = await User.findById(req.userId);
    if (user.kycStatus !== 'verified') return res.status(400).json({ error: 'KYC verification required' });
    if (!amount || amount < 100) return res.status(400).json({ error: 'Invalid amount' });
    
    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: 'INR',
      receipt: `receipt_${uuidv4()}`,
      description: `Instafund ${accountType} Account`
    });
    
    res.json({ success: true, orderId: order.id, amount: order.amount, currency: order.currency });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/payment/verify', authMiddleware, async (req, res) => {
  try {
    const { razorpayPaymentId, razorpayOrderId, razorpaySignature, amount } = req.body;
    const crypto = require('crypto');
    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');
    
    if (expectedSignature !== razorpaySignature) return res.status(400).json({ error: 'Payment verification failed' });
    
    const user = await User.findById(req.userId);
    user.paymentStatus = 'completed';
    user.paymentId = razorpayPaymentId;
    user.initialAmount = amount === 400 ? 40000 : amount === 500 ? 50000 : 100000;
    user.accountBalance = user.initialAmount;
    user.accountStatus = 'active';
    user.currentPhase = 'task1';
    
    await user.save();
    res.json({ success: true, message: 'Payment verified', user: { _id: user._id, name: user.name, accountBalance: user.accountBalance, currentPhase: user.currentPhase, kycStatus: user.kycStatus } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/trading/place-trade', authMiddleware, async (req, res) => {
  try {
    const { symbol, side, quantity, entryPrice, exitPrice, broker } = req.body;
    const user = await User.findById(req.userId);
    
    const pnl = (exitPrice - entryPrice) * quantity;
    const pnlPercent = ((exitPrice - entryPrice) / entryPrice) * 100;
    
    const trade = { symbol, side, quantity, entryPrice, exitPrice, pnl, pnlPercent, timestamp: new Date(), broker: broker || 'demo', orderId: uuidv4() };
    
    user.trades.push(trade);
    user.currentPnL += pnl;
    user.accountBalance = user.initialAmount + user.currentPnL;
    
    if (user.currentPnL < user.maxDrawdown) user.maxDrawdown = user.currentPnL;
    if (user.maxDrawdown < -user.initialAmount * 0.1) {
      user.isBreached = true;
      user.breachReason = 'Loss limit exceeded';
      user.accountStatus = 'breached';
    }
    
    await user.save();
    res.json({ success: true, trade, accountBalance: user.accountBalance, currentPnL: user.currentPnL, isBreached: user.isBreached });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/dashboard/stats', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    const profitPercent = (user.currentPnL / user.initialAmount) * 100;
    const drawdownPercent = (Math.abs(user.maxDrawdown) / user.initialAmount) * 100;
    
    const qualifiesForAdvance = profitPercent >= 10 && user.trades.length >= 5 && !user.isBreached;
    
    res.json({
      success: true,
      user: { name: user.name, email: user.email, accountStatus: user.accountStatus, currentPhase: user.currentPhase, kycStatus: user.kycStatus },
      stats: { accountBalance: user.accountBalance, initialAmount: user.initialAmount, currentPnL: user.currentPnL, profitPercent, maxDrawdown: user.maxDrawdown, drawdownPercent, totalTrades: user.trades.length, isBreached: user.isBreached, breachReason: user.breachReason },
      rules: { profitTarget: 10, maxDailyDrawdown: 0.05, maxTotalDrawdown: 0.1, minTrades: 5, minTradingDays: 5 },
      qualifiesForAdvance,
      trades: user.trades.slice(-10)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/trading/advance-phase', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const profitPercent = (user.currentPnL / user.initialAmount) * 100;
    
    if (profitPercent < 10) return res.status(400).json({ error: 'Profit target not met' });
    if (user.isBreached) return res.status(400).json({ error: 'Account is breached' });
    
    if (user.currentPhase === 'task1') user.currentPhase = 'task2';
    else if (user.currentPhase === 'task2') {
      user.currentPhase = 'task3';
      user.accountStatus = 'funded';
    }
    
    user.currentPnL = 0;
    user.maxDrawdown = 0;
    user.dailyDrawdown = 0;
    user.trades = [];
    
    await user.save();
    res.json({ success: true, message: `Advanced to ${user.currentPhase}`, newPhase: user.currentPhase });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📦 MongoDB: Connected`);
  console.log(`💳 Razorpay: Configured`);
  console.log(`🔐 KYC System: Enabled`);
});

module.exports = app;
