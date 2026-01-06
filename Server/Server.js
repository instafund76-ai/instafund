const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Database (In-memory for now, use MongoDB in production)
let users = {};
let adminSettings = {
  adminPassword: 'admin123',
  companyName: 'Instafund',
  companyCommission: 20,
  minWithdrawal: 1000,
  processingDays: 3
};

let tradingRules = {
  task1: {
    name: "Evaluation Phase 1",
    accountSize: 50000,
    profitTarget: 0.10,
    maxDailyDrawdown: 0.05,
    maxTotalDrawdown: 0.10,
    minTradingDays: 10,
    minTrades: 5
  },
  task2: {
    name: "Verification Phase",
    accountSize: 50000,
    profitTarget: 0.10,
    maxDailyDrawdown: 0.05,
    maxTotalDrawdown: 0.10,
    minTradingDays: 10,
    minTrades: 5
  },
  task3: {
    name: "Live Funded Trading",
    accountSize: 100000,
    profitTarget: 0.15,
    maxDailyDrawdown: 0.03,
    maxTotalDrawdown: 0.15,
    minTradingDays: 20,
    profitSharePercent: 80
  }
};

// ============ ADMIN ROUTES ============

// Login Admin
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  
  if (password === adminSettings.adminPassword) {
    res.json({ success: true, message: 'Admin logged in successfully' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid password' });
  }
});

// Get Admin Settings
app.get('/api/admin/settings', (req, res) => {
  res.json({ settings: adminSettings, rules: tradingRules });
});

// Update Trading Rules
app.post('/api/admin/rules/update', (req, res) => {
  const { task1, task2, task3 } = req.body;
  
  if (task1) tradingRules.task1 = { ...tradingRules.task1, ...task1 };
  if (task2) tradingRules.task2 = { ...tradingRules.task2, ...task2 };
  if (task3) tradingRules.task3 = { ...tradingRules.task3, ...task3 };
  
  res.json({ success: true, message: 'Rules updated', rules: tradingRules });
});

// Update Platform Settings
app.post('/api/admin/settings/update', (req, res) => {
  const { companyName, adminPassword, companyCommission, minWithdrawal, processingDays } = req.body;
  
  if (companyName) adminSettings.companyName = companyName;
  if (adminPassword) adminSettings.adminPassword = adminPassword;
  if (companyCommission !== undefined) adminSettings.companyCommission = companyCommission;
  if (minWithdrawal !== undefined) adminSettings.minWithdrawal = minWithdrawal;
  if (processingDays !== undefined) adminSettings.processingDays = processingDays;
  
  res.json({ success: true, message: 'Settings updated', settings: adminSettings });
});

// Get All Users
app.get('/api/admin/users', (req, res) => {
  res.json({ users: Object.values(users) });
});

// ============ USER ROUTES ============

// Register User
app.post('/api/users/register', (req, res) => {
  const { userId, name, email, phone, amount } = req.body;
  
  if (!userId || !name || !email) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }
  
  users[userId] = {
    userId,
    name,
    email,
    phone,
    amount,
    currentPhase: 'task1',
    isBreached: false,
    breachReason: null,
    currentPnL: 0,
    maxDrawdown: 0,
    todayDrawdown: 0,
    trades: [],
    tradingDaysCompleted: 0,
    registeredAt: new Date().toISOString(),
    withdrawalStatus: 'pending'
  };
  
  res.json({ success: true, message: 'User registered', user: users[userId] });
});

// Get User Data
app.get('/api/users/:userId', (req, res) => {
  const { userId } = req.params;
  
  if (!users[userId]) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  
  res.json({ user: users[userId] });
});

// Place Trade
app.post('/api/users/:userId/trade', (req, res) => {
  const { userId } = req.params;
  const { symbol, side, quantity, entryPrice, exitPrice } = req.body;
  
  if (!users[userId]) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  
  const user = users[userId];
  const pnl = (exitPrice - entryPrice) * quantity;
  const pnlPercent = ((exitPrice - entryPrice) / entryPrice) * 100;
  
  const trade = {
    id: `TRADE_${Date.now()}`,
    date: new Date().toISOString(),
    symbol,
    side,
    quantity,
    entryPrice,
    exitPrice,
    pnl,
    pnlPercent
  };
  
  user.trades.push(trade);
  user.currentPnL += pnl;
  user.todayDrawdown = Math.min(user.todayDrawdown, -Math.abs(pnl));
  
  if (user.currentPnL < user.maxDrawdown) {
    user.maxDrawdown = user.currentPnL;
  }
  
  res.json({ success: true, message: 'Trade placed', trade, user });
});

// Advance Phase
app.post('/api/users/:userId/advance', (req, res) => {
  const { userId } = req.params;
  
  if (!users[userId]) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  
  const user = users[userId];
  
  if (user.isBreached) {
    return res.status(400).json({ success: false, message: 'Account breached' });
  }
  
  const phases = ['task1', 'task2', 'task3'];
  const currentIndex = phases.indexOf(user.currentPhase);
  
  if (currentIndex < phases.length - 1) {
    user.currentPhase = phases[currentIndex + 1];
    user.currentPnL = 0;
    user.todayDrawdown = 0;
    user.trades = [];
    user.tradingDaysCompleted = 0;
    user.maxDrawdown = 0;
    
    res.json({ success: true, message: 'Phase advanced', user });
  } else {
    res.status(400).json({ success: false, message: 'Already at final phase' });
  }
});

// ============ WITHDRAWAL ROUTES ============

// Process Withdrawal
app.post('/api/users/:userId/withdraw', (req, res) => {
  const { userId } = req.params;
  const { bankHolder, bankAccount, bankIFSC, bankName } = req.body;
  
  if (!users[userId]) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  
  const user = users[userId];
  
  if (user.currentPhase !== 'task3') {
    return res.status(400).json({ success: false, message: 'User not eligible for withdrawal' });
  }
  
  const totalProfit = user.currentPnL;
  const commission = adminSettings.companyCommission;
  const traderShare = totalProfit * (100 - commission) / 100;
  
  if (traderShare < adminSettings.minWithdrawal) {
    return res.status(400).json({ 
      success: false, 
      message: `Minimum withdrawal is ₹${adminSettings.minWithdrawal}` 
    });
  }
  
  const withdrawal = {
    id: `WITHDRAWAL_${Date.now()}`,
    date: new Date().toISOString(),
    amount: traderShare,
    bankHolder,
    bankAccount,
    bankIFSC,
    bankName,
    status: 'processing',
    processingDays: adminSettings.processingDays
  };
  
  user.withdrawalStatus = 'processing';
  user.lastWithdrawal = withdrawal;
  
  res.json({ 
    success: true, 
    message: 'Withdrawal request submitted', 
    withdrawal,
    processingDays: adminSettings.processingDays
  });
});

// ============ ERROR HANDLING ============
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Server error' });
});

// ============ START SERVER ============
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Instafund Server running on http://localhost:${PORT}`);
  console.log('🔑 Default Admin Password: admin123');
});
