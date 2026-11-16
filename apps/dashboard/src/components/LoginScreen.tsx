import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Loader2,
  Sparkles,
  Tag,
  Store,
  TrendingDown,
  Check,
} from 'lucide-react';
import quickshelfLogo from '../assets/quickshelf-logo.webp';
import quickshelfIcon from '../assets/quickshelf-icon.png';

interface LoginScreenProps {
  apiBase: string;
  onLoginSuccess: (token: string, user: { id: string; email: string; name: string; role: string }) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ apiBase, onLoginSuccess }) => {
  const [email, setEmail] = useState(() => localStorage.getItem('qs_last_login_email') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter both work email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(data.error || 'Authentication failed. Please verify your credentials.');
        setIsLoading(false);
        return;
      }

      // Store in localStorage for session persistence
      localStorage.setItem('qs_auth_token', data.token);
      localStorage.setItem('qs_last_login_email', email.trim());
      localStorage.setItem('qs_user_email', data.user.email);
      localStorage.setItem('qs_user_name', data.user.name);
      localStorage.setItem('qs_user_role', data.user.role);

      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setErrorMessage(
        err.message?.includes('Failed to fetch')
          ? 'Network error: Unable to reach the authentication server. Please check your connectivity.'
          : (err.message || 'An unexpected error occurred during login.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#f8fafc',
        backgroundImage: `
          radial-gradient(at 12% 18%, rgba(59, 130, 246, 0.16) 0px, transparent 48%),
          radial-gradient(at 88% 22%, rgba(139, 92, 246, 0.15) 0px, transparent 48%),
          radial-gradient(at 50% 90%, rgba(6, 182, 212, 0.12) 0px, transparent 50%)
        `,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        boxSizing: 'border-box',
      }}
    >
      {/* Soft Blurred Ambient Light Blooms */}
      <div
        style={{
          position: 'absolute',
          top: '-100px',
          left: '10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.25) 0%, transparent 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-120px',
          right: '8%',
          width: '540px',
          height: '540px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.22) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />

      {/* Main Glassmorphic Container */}
      <div
        className="glass-login-container"
        style={{
          width: '100%',
          maxWidth: '1060px',
          minHeight: '620px',
          display: 'flex',
          flexDirection: 'row',
          borderRadius: '24px',
          backgroundColor: 'rgba(255, 255, 255, 0.75)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.9)',
          boxShadow: `
            0 25px 50px -12px rgba(15, 23, 42, 0.08),
            0 0 0 1px rgba(255, 255, 255, 0.8),
            0 10px 25px -5px rgba(15, 23, 42, 0.03)
          `,
          overflow: 'hidden',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {/* =========================================================================
            LEFT PANEL: ARTISTIC, MINIMALIST VISUAL BRAND SHOWCASE
        ========================================================================== */}
        <div
          className="glass-illustration-panel"
          style={{
            flex: '1 1 52%',
            background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.6) 0%, rgba(241, 245, 249, 0.5) 100%)',
            borderRight: '1px solid rgba(226, 232, 240, 0.7)',
            padding: '48px 44px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Top Brand & Clean Tagline */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
              <img
                src={quickshelfLogo}
                alt="QuickShelf"
                style={{
                  height: '32px',
                  objectFit: 'contain',
                }}
              />
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(37, 99, 235, 0.08)',
                  border: '1px solid rgba(37, 99, 235, 0.2)',
                  color: '#2563eb',
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                }}
              >
                <Sparkles size={11} />
                <span>Smart Retail Shelf</span>
              </span>
            </div>

            <h2
              style={{
                fontSize: '28px',
                fontWeight: 800,
                color: '#0f172a',
                lineHeight: 1.25,
                letterSpacing: '-0.02em',
                margin: '0 0 12px 0',
              }}
            >
              Effortless digital pricing for modern retail stores.
            </h2>
            <p
              style={{
                fontSize: '14px',
                color: '#64748b',
                lineHeight: 1.5,
                margin: 0,
                maxWidth: '420px',
              }}
            >
              Update shelf prices in seconds, eliminate paper tags, and keep your physical store in perfect harmony with your digital catalog.
            </p>
          </div>

          {/* Clean, Aesthetic Visual Illustration: Floating Smart Tag Cards */}
          <div
            style={{
              position: 'relative',
              margin: '36px 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Background Ambient Glow */}
            <div
              style={{
                position: 'absolute',
                width: '320px',
                height: '200px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(59, 130, 246, 0.16) 0%, transparent 70%)',
                filter: 'blur(30px)',
              }}
            />

            {/* Main Floating Smart Price Tag Card (Clean & Modern) */}
            <div
              style={{
                position: 'relative',
                zIndex: 2,
                width: '100%',
                maxWidth: '380px',
                backgroundColor: '#ffffff',
                borderRadius: '18px',
                padding: '20px',
                boxShadow: `
                  0 20px 35px -10px rgba(15, 23, 42, 0.1),
                  0 0 0 1px rgba(226, 232, 240, 0.8),
                  0 2px 6px rgba(15, 23, 42, 0.04)
                `,
                border: '1px solid rgba(255, 255, 255, 0.9)',
                transition: 'transform 0.2s ease',
              }}
            >
              {/* Product Category & Status Pill */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Artisan Bakery • Fresh Batch
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fee2e2',
                    color: '#dc2626',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '9999px',
                  }}
                >
                  <TrendingDown size={11} />
                  <span>20% OFF</span>
                </span>
              </div>

              {/* Product Name & Clean Price Display */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                    Sourdough Loaf 500g
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                    Aisle 02 • Shelf 3
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11.5px', color: '#94a3b8', textDecoration: 'line-through', fontWeight: 600 }}>
                    $4.99
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', lineHeight: 1, letterSpacing: '-0.03em' }}>
                    $3<span style={{ fontSize: '18px' }}>.99</span>
                  </div>
                </div>
              </div>

              {/* Instant Sync Indicator Strip */}
              <div
                style={{
                  marginTop: '16px',
                  paddingTop: '12px',
                  borderTop: '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  color: '#059669',
                  fontWeight: 600,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: '#10b981',
                      boxShadow: '0 0 6px rgba(16, 185, 129, 0.6)',
                    }}
                  />
                  <span>Display in Sync with POS</span>
                </div>
                <span style={{ color: '#94a3b8', fontWeight: 500 }}>Updated seconds ago</span>
              </div>
            </div>

            {/* Overlapping Floating Frosted Pill */}
            <div
              style={{
                position: 'relative',
                zIndex: 3,
                marginTop: '-14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(255, 255, 255, 0.88)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(226, 232, 240, 0.9)',
                boxShadow: '0 10px 20px -5px rgba(15, 23, 42, 0.08)',
                fontSize: '12px',
                fontWeight: 600,
                color: '#1e293b',
              }}
            >
              <Sparkles size={14} color="#2563eb" />
              <span>Instant price broadcast across all tags</span>
            </div>
          </div>

          {/* Bottom Social Proof / Trust Line */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              paddingTop: '20px',
              borderTop: '1px solid rgba(226, 232, 240, 0.7)',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb',
                flexShrink: 0,
              }}
            >
              <Store size={16} />
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
              <strong style={{ color: '#0f172a' }}>Built for store teams.</strong> Simple to learn, fast to deploy, and loved by floor managers.
            </div>
          </div>
        </div>

        {/* =========================================================================
            RIGHT PANEL: CLEAN, INTUITIVE GLASS LOGIN FORM
        ========================================================================== */}
        <div
          className="glass-form-panel"
          style={{
            flex: '1 1 48%',
            padding: '48px 44px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.55)',
            position: 'relative',
          }}
        >
          <div style={{ width: '100%', maxWidth: '380px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid rgba(226, 232, 240, 0.8)',
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)',
                  marginBottom: '16px',
                }}
              >
                <img
                  src={quickshelfIcon}
                  alt="QuickShelf"
                  style={{ width: '28px', height: '28px', objectFit: 'contain' }}
                />
              </div>

              <h1
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: '#0f172a',
                  letterSpacing: '-0.025em',
                  margin: '0 0 6px 0',
                }}
              >
                Sign In
              </h1>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                Enter your work credentials to manage your store shelves.
              </p>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '11px 13px',
                  borderRadius: '10px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  marginBottom: '18px',
                  color: '#991b1b',
                  fontSize: '13px',
                  lineHeight: 1.4,
                  animation: 'dropdownFadeIn 0.2s ease-out',
                }}
              >
                <AlertCircle size={17} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>{errorMessage}</div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: '6px',
                  }}
                >
                  Work Email
                </label>
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#94a3b8',
                      pointerEvents: 'none',
                      display: 'flex',
                    }}
                  >
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    required
                    style={{
                      width: '100%',
                      height: '42px',
                      paddingLeft: '38px',
                      paddingRight: '12px',
                      borderRadius: '10px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#0f172a',
                      fontSize: '14px',
                      fontWeight: 500,
                      outline: 'none',
                      boxSizing: 'border-box',
                      boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                      transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#2563eb';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.15)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#cbd5e1';
                      e.currentTarget.style.boxShadow = '0 1px 2px rgba(15, 23, 42, 0.04)';
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: '6px',
                  }}
                >
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#94a3b8',
                      pointerEvents: 'none',
                      display: 'flex',
                    }}
                  >
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    style={{
                      width: '100%',
                      height: '42px',
                      paddingLeft: '38px',
                      paddingRight: '40px',
                      borderRadius: '10px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#0f172a',
                      fontSize: '14px',
                      fontWeight: 500,
                      outline: 'none',
                      boxSizing: 'border-box',
                      boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                      transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#2563eb';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.15)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#cbd5e1';
                      e.currentTarget.style.boxShadow = '0 1px 2px rgba(15, 23, 42, 0.04)';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  height: '44px',
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '6px',
                  opacity: isLoading ? 0.8 : 1,
                  boxShadow: '0 8px 18px -3px rgba(37, 99, 235, 0.35)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 10px 22px -3px rgba(37, 99, 235, 0.45)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 18px -3px rgba(37, 99, 235, 0.35)';
                  }
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={17} className="anim-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div
              style={{
                marginTop: '28px',
                paddingTop: '16px',
                borderTop: '1px solid #f1f5f9',
                fontSize: '12px',
                color: '#94a3b8',
                textAlign: 'center',
              }}
            >
              QuickShelf Operations • Secure & Encrypted Session
            </div>
          </div>
        </div>
      </div>

      {/* Responsive Media Query */}
      <style>{`
        @media (max-width: 900px) {
          .glass-illustration-panel {
            display: none !important;
          }
          .glass-login-container {
            max-width: 440px !important;
            min-height: auto !important;
          }
          .glass-form-panel {
            padding: 36px 24px !important;
          }
        }
      `}</style>
    </div>
  );
};
