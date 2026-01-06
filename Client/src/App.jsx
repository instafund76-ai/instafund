import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (token) fetchUserData();
  }, [token]);

  const fetchUserData = async () => {
    try {
      const response = await axios.get(`${API_URL}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data.user);
    } catch (error) {
      setToken(null);
      localStorage.removeItem('token');
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    setCurrentPage('home');
  };

  if (!token) {
    return (
      <div className="app">
        <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} isLoggedIn={false} />
        {currentPage === 'home' && <HomePage setCurrentPage={setCurrentPage} />}
        {currentPage === 'login' && (
          <LoginPage
            setCurrentPage={setCurrentPage}
            setToken={setToken}
            setUser={setUser}
            showMessage={showMessage}
          />
        )}
        {currentPage === 'register' && (
          <RegisterPage
            setCurrentPage={setCurrentPage}
            setToken={setToken}
            showMessage={showMessage}
          />
        )}
        {message.text && <AlertMessage type={message.type} text={message.text} />}
      </div>
    );
  }

  return (
    <div className="app">
      <Navbar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        isLoggedIn={true}
        onLogout={handleLogout}
        userName={user?.name}
      />
      {currentPage === 'dashboard' && (
        <Dashboard token={token} setCurrentPage={setCurrentPage} showMessage={showMessage} />
      )}
      {currentPage === 'kyc' && (
        <KYCPage token={token} showMessage={showMessage} setCurrentPage={setCurrentPage} />
      )}
      {currentPage === 'payment' && (
        <PaymentPage token={token} showMessage={showMessage} setCurrentPage={setCurrentPage} />
      )}
      {currentPage === 'trading' && <TradingPage token={token} showMessage={showMessage} />}
      {currentPage === 'withdrawal' && <WithdrawalPage />}
      {message.text && <AlertMessage type={message.type} text={message.text} />}
    </div>
  );
}

function Navbar({ setCurrentPage, isLoggedIn, onLogout, userName }) {
  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="logo" onClick={() => setCurrentPage('home')}>
          <div className="logo-icon">📈</div>
          <span>InstaFund</span>
        </div>
        {isLoggedIn && (
          <ul className="nav-links">
            <li>
              <a onClick={() => setCurrentPage('dashboard')}>Dashboard</a>
            </li>
            <li>
              <a onClick={() => setCurrentPage('trading')}>Trading</a>
            </li>
            <li>
              <a onClick={() => setCurrentPage('withdrawal')}>Withdrawal</a>
            </li>
          </ul>
        )}
        <div className="nav-cta">
          {isLoggedIn ? (
            <>
              <span style={{ marginRight: '1rem', fontSize: '0.9rem' }}>Hello, {userName}!</span>
              <button className="btn btn-secondary" onClick={onLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={() => setCurrentPage('login')}>
                Login
              </button>
              <button className="btn btn-primary" onClick={() => setCurrentPage('register')}>
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function HomePage({ setCurrentPage }) {
  return (
    <section className="hero">
      <h1>🚀 Get Funded to Trade</h1>
      <p>
        Get instant funding for your trading account. Complete challenges and unlock real funded
        accounts with up to 10x leverage.
      </p>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
        <button className="btn btn-primary btn-lg" onClick={() => setCurrentPage('register')}>
          Start Challenge
        </button>
        <button className="btn btn-secondary btn-lg" onClick={() => setCurrentPage('login')}>
          Login
        </button>
      </div>
      <div className="dashboard-grid" style={{ marginTop: '4rem' }}>
        <div className="dashboard-card">
          <h4>Challenge Amount</h4>
          <div className="stat-value">₹40,000</div>
          <p className="stat-label">Starting Capital</p>
        </div>
        <div className="dashboard-card">
          <h4>Profit Target</h4>
          <div className="stat-value">10%</div>
          <p className="stat-label">To Advance Phase</p>
        </div>
        <div className="dashboard-card">
          <h4>Max Drawdown</h4>
          <div className="stat-value">5%</div>
          <p className="stat-label">Daily Limit</p>
        </div>
        <div className="dashboard-card">
          <h4>Profit Share</h4>
          <div className="stat-value">80%</div>
          <p className="stat-label">Your Share</p>
        </div>
      </div>
    </section>
  );
}

function LoginPage({ setCurrentPage, setToken, setUser, showMessage }) {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/login`, formData);
      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        setToken(response.data.token);
        setUser(response.data.user);
        showMessage('success', 'Login successful!');
        setCurrentPage('dashboard');
      }
    } catch (error) {
      showMessage('error', error.response?.data?.error || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2>Login to Your Account</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            placeholder="Enter your email"
            required
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={formData.password}
            onChange={e => setFormData({ ...formData, password: e.target.value })}
            placeholder="Enter your password"
            required
          />
        </div>
        <button className="btn btn-primary btn-block" disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <p style={{ marginTop: '1rem', textAlign: 'center' }}>
        Don't have an account?{' '}
        <a
          onClick={() => setCurrentPage('register')}
          style={{ cursor: 'pointer', color: '#00d4ff' }}
        >
          Register here
        </a>
      </p>
    </div>
  );
}

function RegisterPage({ setCurrentPage, setToken, showMessage }) {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/register`, formData);
      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        setToken(response.data.token);
        showMessage('success', 'Registration successful!');
        setCurrentPage('kyc');
      }
    } catch (error) {
      showMessage('error', error.response?.data?.error || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2>Create Your Account</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Full Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter your full name"
            required
          />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            placeholder="Enter your email"
            required
          />
        </div>
        <div className="form-group">
          <label>Phone Number</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={e => setFormData({ ...formData, phone: e.target.value })}
            placeholder="Enter your phone number"
            required
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={formData.password}
            onChange={e => setFormData({ ...formData, password: e.target.value })}
            placeholder="Enter a strong password"
            required
          />
        </div>
        <button className="btn btn-primary btn-block" disabled={isLoading}>
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>
      <p style={{ marginTop: '1rem', textAlign: 'center' }}>
        Already have an account?{' '}
        <a
          onClick={() => setCurrentPage('login')}
          style={{ cursor: 'pointer', color: '#00d4ff' }}
        >
          Login here
        </a>
      </p>
    </div>
  );
}

function KYCPage({ token, showMessage, setCurrentPage }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    panNumber: '',
    aadharNumber: '',
    address: '',
    city: '',
    state: '',
    pincode: ''
  });
  const [documents, setDocuments] = useState({
    aadharDocument: null,
    panDocument: null,
    selfieImage: null,
    addressProof: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [kycStatus, setKycStatus] = useState('pending');

  useEffect(() => {
    fetchKYCStatus();
  }, []);

  const fetchKYCStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/kyc/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.kycStatus !== 'not_started') {
        setKycStatus(response.data.kycStatus);
        if (response.data.kyc) setFormData(prev => ({ ...prev, ...response.data.kyc }));
      }
    } catch {
      // ignore
    }
  };

  const handleStartKYC = async e => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await axios.post(`${API_URL}/kyc/start`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setStep(2);
        showMessage('success', 'KYC started. Please upload documents.');
      }
    } catch (error) {
      showMessage('error', error.response?.data?.error || 'Failed to start KYC');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = e => {
    const { name, files } = e.target;
    if (files[0]) setDocuments(prev => ({ ...prev, [name]: files[0] }));
  };

  const handleUploadDocuments = async e => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const fd = new FormData();
      Object.keys(documents).forEach(key => {
        if (documents[key]) fd.append(key, documents[key]);
      });
      await axios.post(`${API_URL}/kyc/upload-documents`, fd, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setStep(3);
      showMessage('success', 'Documents uploaded successfully!');
    } catch (error) {
      showMessage('error', error.response?.data?.error || 'Upload failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitKYC = async e => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await axios.post(
        `${API_URL}/kyc/submit`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setKycStatus('verified');
        showMessage('success', 'KYC verified successfully!');
        setTimeout(() => setCurrentPage('payment'), 1500);
      } else {
        setKycStatus('rejected');
        showMessage('error', `KYC rejected: ${res.data.reason}`);
      }
    } catch (error) {
      showMessage('error', error.response?.data?.error || 'Submission failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (kycStatus === 'verified') {
    return (
      <div className="form-container">
        <h2>✅ KYC Verified</h2>
        <div className="rule-status">Your KYC has been verified successfully!</div>
        <p style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          You can now proceed to payment.
        </p>
        <button
          className="btn btn-primary btn-block"
          onClick={() => setCurrentPage('payment')}
          style={{ marginTop: '1rem' }}
        >
          Proceed to Payment
        </button>
      </div>
    );
  }

  return (
    <div className="form-container">
      <h2>Know Your Customer (KYC)</h2>
      <p style={{ fontSize: '0.9rem', color: '#8892b0', marginBottom: '1.5rem' }}>
        Step {step} of 3
      </p>

      {step === 1 && (
        <form onSubmit={handleStartKYC}>
          <div className="form-group">
            <label>Full Name *</label>
            <input
              type="text"
              value={formData.fullName}
              onChange={e => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="Enter your full name"
              required
            />
          </div>
          <div className="form-group">
            <label>Date of Birth *</label>
            <input
              type="date"
              value={formData.dateOfBirth}
              onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>PAN Number *</label>
            <input
              type="text"
              value={formData.panNumber}
              onChange={e =>
                setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })
              }
              placeholder="XXXXXXXX0XXX"
              maxLength="10"
              required
            />
          </div>
          <div className="form-group">
            <label>Aadhar Number *</label>
            <input
              type="text"
              value={formData.aadharNumber}
              onChange={e => setFormData({ ...formData, aadharNumber: e.target.value })}
              placeholder="XXXX XXXX XXXX"
              maxLength="12"
              required
            />
          </div>
          <div className="form-group">
            <label>Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              placeholder="House No., Street Name"
            />
          </div>
          <div className="form-row">
            <div className="form-col">
              <label>City</label>
              <input
                type="text"
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
              />
            </div>
            <div className="form-col">
              <label>State</label>
              <input
                type="text"
                value={formData.state}
                onChange={e => setFormData({ ...formData, state: e.target.value })}
                placeholder="State"
              />
            </div>
            <div className="form-col">
              <label>Pincode</label>
              <input
                type="text"
                value={formData.pincode}
                onChange={e => setFormData({ ...formData, pincode: e.target.value })}
                placeholder="Pincode"
              />
            </div>
          </div>
          <button className="btn btn-primary btn-block" disabled={isLoading}>
            {isLoading ? 'Processing...' : 'Next: Upload Documents'}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleUploadDocuments}>
          <div className="form-group">
            <label>Aadhar Document (PDF/JPG) *</label>
            <input
              type="file"
              name="aadharDocument"
              onChange={handleFileUpload}
              accept=".pdf,.jpg,.jpeg,.png"
              required
            />
            {documents.aadharDocument && (
              <p style={{ color: '#00ff88' }}>✓ Selected</p>
            )}
          </div>
          <div className="form-group">
            <label>PAN Document (PDF/JPG) *</label>
            <input
              type="file"
              name="panDocument"
              onChange={handleFileUpload}
              accept=".pdf,.jpg,.jpeg,.png"
              required
            />
            {documents.panDocument && (
              <p style={{ color: '#00ff88' }}>✓ Selected</p>
            )}
          </div>
          <div className="form-group">
            <label>Selfie Photo (JPG/PNG) *</label>
            <input
              type="file"
              name="selfieImage"
              onChange={handleFileUpload}
              accept=".jpg,.jpeg,.png"
              required
            />
            {documents.selfieImage && (
              <p style={{ color: '#00ff88' }}>✓ Selected</p>
            )}
          </div>
          <div className="form-group">
            <label>Address Proof (Utility Bill/Passport) *</label>
            <input
              type="file"
              name="addressProof"
              onChange={handleFileUpload}
              accept=".pdf,.jpg,.jpeg,.png"
              required
            />
            {documents.addressProof && (
              <p style={{ color: '#00ff88' }}>✓ Selected</p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
              Back
            </button>
            <button className="btn btn-primary" disabled={isLoading}>
              {isLoading ? 'Uploading...' : 'Upload Documents'}
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <div>
          <div className="rule-status">All documents uploaded successfully!</div>
          <p style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
            Your documents will be verified within 24 hours. You'll receive an email confirmation
            once verified.
          </p>
          <button
            className="btn btn-primary btn-block"
            onClick={handleSubmitKYC}
            disabled={isLoading}
          >
            {isLoading ? 'Submitting...' : 'Submit for Verification'}
          </button>
        </div>
      )}
    </div>
  );
}

function PaymentPage({ token, showMessage, setCurrentPage }) {
  const [selectedAmount, setSelectedAmount] = useState(400);
  const [isProcessing, setIsProcessing] = useState(false);

  const amounts = [
    { value: 400, label: '₹40,000 Initial' },
    { value: 500, label: '₹50,000 Initial' },
    { value: 1000, label: '₹1,00,000 Initial' }
  ];

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      const res = await axios.post(
        `${API_URL}/payment/create-order`,
        { amount: selectedAmount, accountType: 'Funded Trading' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY,
        amount: res.data.amount,
        currency: res.data.currency,
        name: 'InstaFund',
        description: 'Trading Account Funding',
        order_id: res.data.orderId,
        handler: async paymentResult => {
          try {
            const verifyRes = await axios.post(
              `${API_URL}/payment/verify`,
              {
                razorpayPaymentId: paymentResult.razorpay_payment_id,
                razorpayOrderId: paymentResult.razorpay_order_id,
                razorpaySignature: paymentResult.razorpay_signature,
                amount: selectedAmount
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (verifyRes.data.success) {
              showMessage('success', 'Payment successful! Account activated.');
              setTimeout(() => setCurrentPage('dashboard'), 1500);
            }
          } catch {
            showMessage('error', 'Payment verification failed');
          }
        },
        theme: { color: '#00d4ff' }
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      showMessage('error', error.response?.data?.error || 'Payment initiation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="form-container">
      <h2>Select Account Size</h2>
      <div className="withdrawal-grid">
        {amounts.map(amount => (
          <div
            key={amount.value}
            className={`withdrawal-card ${selectedAmount === amount.value ? 'color-success' : ''}`}
            onClick={() => setSelectedAmount(amount.value)}
            style={{ cursor: 'pointer', opacity: selectedAmount === amount.value ? 1 : 0.7 }}
          >
            <h4>Account Size</h4>
            <div className="amount">{amount.label}</div>
            <p style={{ color: '#8892b0', marginBottom: '0.5rem' }}>10% Profit Target</p>
            <p style={{ color: '#00ff88', fontWeight: 'bold' }}>
              {selectedAmount === amount.value ? '✓ Selected' : 'Click to select'}
            </p>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: 'rgba(0, 212, 255, 0.1)',
          borderRadius: '8px',
          marginBottom: '1.5rem'
        }}
      >
        <h4 style={{ color: '#00d4ff', marginBottom: '0.75rem' }}>Account Details</h4>
        <ul style={{ color: '#8892b0', lineHeight: '1.8' }}>
          <li>✓ Phase 1: Reach 10% profit to advance</li>
          <li>✓ Phase 2: Reach 10% profit again</li>
          <li>✓ Phase 3: Funded account with real capital</li>
          <li>✓ You keep 80% of profits</li>
          <li>✓ Max Daily Drawdown: 5%</li>
          <li>✓ Max Total Drawdown: 10%</li>
        </ul>
      </div>
      <button
        className="btn btn-success btn-block btn-lg"
        onClick={handlePayment}
        disabled={isProcessing}
      >
        {isProcessing ? 'Processing...' : `Pay ₹${selectedAmount} to Start`}
      </button>
    </div>
  );
}

function Dashboard({ token, showMessage }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await axios.get(`${API_URL}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardData(res.data);
      setIsLoading(false);
    } catch {
      setIsLoading(false);
    }
  };

  const handleAdvancePhase = async () => {
    try {
      const res = await axios.post(
        `${API_URL}/trading/advance-phase`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        showMessage('success', `Advanced to ${res.data.newPhase}!`);
        fetchDashboardData();
      }
    } catch (error) {
      showMessage('error', error.response?.data?.error || 'Cannot advance phase');
    }
  };

  if (isLoading || !dashboardData) return <div className="loading">Loading dashboard...</div>;

  const { user, stats, trades, qualifiesForAdvance } = dashboardData;

  return (
    <div className="dashboard">
      <h2>📊 Trading Dashboard</h2>
      {stats.isBreached && (
        <div className="alert alert-error" style={{ display: 'block', marginBottom: '2rem' }}>
          ⚠️ Account Breached: {stats.breachReason}
        </div>
      )}

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h4>Account Balance</h4>
          <div className="stat-value">₹{stats.accountBalance?.toFixed(2)}</div>
          <p className="stat-label">Current Balance</p>
        </div>
        <div
          className={`dashboard-card ${
            stats.currentPnL >= 0 ? 'color-success' : 'color-danger'
          }`}
        >
          <h4>Profit/Loss</h4>
          <div className="stat-value">
            {stats.currentPnL >= 0 ? '+' : '-'}₹{Math.abs(stats.currentPnL)?.toFixed(2)}
          </div>
          <p className="stat-label">{stats.profitPercent?.toFixed(2)}%</p>
        </div>
        <div className="dashboard-card">
          <h4>Max Drawdown</h4>
          <div className="stat-value">{Math.abs(stats.drawdownPercent)?.toFixed(2)}%</div>
          <p className="stat-label">From Peak</p>
        </div>
        <div className="dashboard-card">
          <h4>Total Trades</h4>
          <div className="stat-value">{stats.totalTrades}</div>
          <p className="stat-label">Completed</p>
        </div>
      </div>

      <div className="rules-section">
        <h3>📋 {user.currentPhase.toUpperCase()} Rules</h3>
        <div className="rule-card">
          <h4>Profit Target: 10%</h4>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${Math.min((stats.profitPercent / 10) * 100, 100)}%` }}
            />
          </div>
          <div className="rule-status">
            {stats.profitPercent.toFixed(2)}% / 10% (
            {stats.profitPercent >= 10 ? '✓ Target Met' : '⏳ In Progress'})
          </div>
        </div>
        <div className="rule-card">
          <h4>Daily Drawdown Limit: 5%</h4>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${Math.min((Math.abs(stats.drawdownPercent) / 5) * 50, 100)}%`
              }}
            />
          </div>
          <div className="rule-status">
            {Math.abs(stats.drawdownPercent)?.toFixed(2)}% / 5% (
            {!stats.isBreached ? '✓ Safe' : '✗ Breached'})
          </div>
        </div>
        <div className="rule-card">
          <h4>Minimum Trades: 5</h4>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${Math.min((stats.totalTrades / 5) * 100, 100)}%` }}
            />
          </div>
          <div className="rule-status">
            {stats.totalTrades} / 5 ({stats.totalTrades >= 5 ? '✓ Requirement Met' : '⏳ In Progress'})
          </div>
        </div>
        {qualifiesForAdvance && (
          <button
            className="btn btn-success btn-block"
            onClick={handleAdvancePhase}
            style={{ marginTop: '1rem' }}
          >
            🚀 Advance to Next Phase
          </button>
        )}
      </div>

      {trades && trades.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h3>Recent Trades</h3>
          <table className="users-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Side</th>
                <th>Quantity</th>
                <th>Entry</th>
                <th>Exit</th>
                <th>P&L</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade, idx) => (
                <tr key={idx}>
                  <td>{trade.symbol}</td>
                  <td style={{ color: trade.side === 'BUY' ? '#00ff88' : '#ff4466' }}>
                    {trade.side}
                  </td>
                  <td>{trade.quantity}</td>
                  <td>₹{trade.entryPrice?.toFixed(2)}</td>
                  <td>₹{trade.exitPrice?.toFixed(2)}</td>
                  <td style={{ color: trade.pnl >= 0 ? '#00ff88' : '#ff4466' }}>
                    {trade.pnl >= 0 ? '+' : '-'}₹{Math.abs(trade.pnl)?.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TradingPage({ token, showMessage }) {
  const [formData, setFormData] = useState({
    symbol: '',
    side: 'BUY',
    quantity: '',
    entryPrice: '',
    exitPrice: '',
    broker: 'demo'
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await axios.post(
        `${API_URL}/trading/place-trade`,
        {
          ...formData,
          quantity: parseFloat(formData.quantity),
          entryPrice: parseFloat(formData.entryPrice),
          exitPrice: parseFloat(formData.exitPrice)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        showMessage('success', `Trade recorded! P&L: ₹${res.data.trade.pnl.toFixed(2)}`);
        setFormData({
          symbol: '',
          side: 'BUY',
          quantity: '',
          entryPrice: '',
          exitPrice: '',
          broker: 'demo'
        });
      }
    } catch (error) {
      showMessage('error', error.response?.data?.error || 'Trade placement failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="trading-page">
      <h2>📈 Record Trade</h2>
      <div className="trade-form">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-col">
              <label>Symbol</label>
              <input
                type="text"
                value={formData.symbol}
                onChange={e =>
                  setFormData({ ...formData, symbol: e.target.value.toUpperCase() })
                }
                placeholder="BANKNIFTY"
                required
              />
            </div>
            <div className="form-col">
              <label>Side</label>
              <select
                value={formData.side}
                onChange={e => setFormData({ ...formData, side: e.target.value })}
              >
                <option>BUY</option>
                <option>SELL</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-col">
              <label>Quantity</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="0"
                required
              />
            </div>
            <div className="form-col">
              <label>Entry Price</label>
              <input
                type="number"
                step="0.01"
                value={formData.entryPrice}
                onChange={e => setFormData({ ...formData, entryPrice: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
            <div className="form-col">
              <label>Exit Price</label>
              <input
                type="number"
                step="0.01"
                value={formData.exitPrice}
                onChange={e => setFormData({ ...formData, exitPrice: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-col">
              <label>Broker</label>
              <select
                value={formData.broker}
                onChange={e => setFormData({ ...formData, broker: e.target.value })}
              >
                <option value="demo">Demo</option>
                <option value="angelOne">Angel One</option>
                <option value="groww">Groww</option>
              </select>
            </div>
          </div>
          <button className="btn btn-primary btn-block btn-lg" disabled={isLoading}>
            {isLoading ? 'Recording...' : 'Record Trade'}
          </button>
        </form>
      </div>
    </div>
  );
}

function WithdrawalPage() {
  return (
    <div className="withdrawal-page">
      <h2>💰 Request Withdrawal</h2>
      <div className="withdrawal-grid">
        <div className="withdrawal-card color-success">
          <h4>Available Balance</h4>
          <div className="amount">₹ --</div>
          <p style={{ fontSize: '0.85rem' }}>From funded account</p>
        </div>
      </div>
    </div>
  );
}

function AlertMessage({ type, text }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: '80px',
        right: '20px',
        zIndex: 999,
        minWidth: '300px'
      }}
    >
      <div className={`alert alert-${type === 'error' ? 'error' : 'success'} show`}>
        {type === 'success' && '✅ '}
        {type === 'error' && '❌ '}
        {text}
      </div>
    </div>
  );
}

export default App;
