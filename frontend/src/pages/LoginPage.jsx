import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Truck, Eye, EyeOff, LogIn } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) { toast.error('Enter username and password'); return; }
    setLoading(true);
    try {
      await login(username, password);
      toast.success('Welcome to TransFleet Pro!');
      navigate('/');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-brand">
          <Truck size={48} />
          <h1>TransFleet Pro</h1>
          <p>Transport Management System</p>
        </div>
        <div className="login-features">
          <div className="feature-item">
            <div className="feature-dot" />
            <span>Daily trip planning & route management</span>
          </div>
          <div className="feature-item">
            <div className="feature-dot" />
            <span>Real-time trip status tracking</span>
          </div>
          <div className="feature-item">
            <div className="feature-dot" />
            <span>KM-based & manual cost calculation</span>
          </div>
          <div className="feature-item">
            <div className="feature-dot" />
            <span>Export reports in Excel & PDF</span>
          </div>
          <div className="feature-item">
            <div className="feature-dot" />
            <span>Multi-user with role-based access</span>
          </div>
        </div>
      </div>

      <div className="login-right">
        <form className="login-form" onSubmit={handleSubmit}>
          <h2>Sign In</h2>
          <p className="login-subtitle">Enter your credentials to access the portal</p>

          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="password-field">
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
            <LogIn size={18} /> {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div className="login-hint">
            <p><strong>Admin:</strong> admin / admin123</p>
            <p><strong>User:</strong> user / user123</p>
          </div>
        </form>
      </div>
    </div>
  );
}
