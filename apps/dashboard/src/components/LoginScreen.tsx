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
  Radio,
  Zap,
  BatteryCharging,
  Layers,
  Sparkles,
  Wifi,
  CheckCircle2,
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

  const fillDemoCredentials = () => {
    setEmail('admin@quickshelf.io');
    setPassword('Quickshelf@2026');
    setErrorMessage(null);
  };

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
        backgroundColor: '#090d16',
        display: 'flex',
        flexDirection: 'row',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* =========================================================================
          LEFT SIDE: RICH BRAND ILLUSTRATION & HARDWARE TELEMETRY SHOWCASE
      ========================================================================== */}
      <div
        className="login-illustration-panel"
        style={{
          flex: '1 1 55%',
          background: 'linear-gradient(145deg, #090d16 0%, #0f172a 45%, #111827 100%)',
          borderRight: '1px solid rgba(51, 65, 85, 0.4)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px 56px',
          overflow: 'hidden',
        }}
      >
        {/* Background glow effects */}
        <div
          style={{
            position: 'absolute',
            top: '-10%',
            left: '-10%',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(37, 99, 235, 0.15) 0%, rgba(15, 23, 42, 0) 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-5%',
            right: '-5%',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, rgba(15, 23, 42, 0) 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Brand Header */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img
            src={quickshelfLogo}
            alt="QuickShelf"
            style={{
              height: '32px',
              objectFit: 'contain',
              filter: 'drop-shadow(0 2px 8px rgba(37, 99, 235, 0.3))',
            }}
          />
          <div
            style={{
              height: '18px',
              width: '1px',
              backgroundColor: 'rgba(148, 163, 184, 0.3)',
            }}
          />
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 8px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(37, 99, 235, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              color: '#60a5fa',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            <Sparkles size={11} />
            <span>Enterprise Operations Cloud</span>
          </div>
        </div>

        {/* Centerpiece Vector Illustration: E-Paper Tag & RF Base Station Sync */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            margin: '32px 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Main Simulated 3-Color E-Paper Display */}
          <div
            style={{
              width: '100%',
              maxWidth: '460px',
              backgroundColor: '#f8fafc',
              borderRadius: '14px',
              padding: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 2px 4px rgba(255, 255, 255, 0.8)',
              border: '6px solid #1e293b',
              position: 'relative',
            }}
          >
            {/* Tag Casing Header & Hardware Badges */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '10px',
                borderBottom: '2px dashed #cbd5e1',
                marginBottom: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#0f172a',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}
                >
                  QuickShelf ESL • HS750-M
                </span>
                <span
                  style={{
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    fontSize: '9.5px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  SPECIAL PROMO
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, fontFamily: 'monospace' }}>
                  CH: 11 • 868MHz
                </span>
                <Wifi size={13} color="#059669" />
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#059669',
                  }}
                >
                  <span>100%</span>
                  <div
                    style={{
                      width: '14px',
                      height: '8px',
                      border: '1px solid #059669',
                      borderRadius: '2px',
                      padding: '1px',
                      display: 'flex',
                    }}
                  >
                    <div style={{ width: '100%', height: '100%', backgroundColor: '#059669' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* E-Paper Screen Content */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  PREMIUM ROAST ARABICA COFFEE 500G
                </div>
                <div style={{ fontSize: '11px', color: '#334155', marginTop: '2px', fontFamily: 'monospace' }}>
                  SKU: BEV-COF-001 • AISLE 04-B
                </div>

                {/* Big Price Display */}
                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                  <div style={{ fontSize: '38px', fontWeight: 900, color: '#0f172a', lineHeight: 1, letterSpacing: '-0.04em' }}>
                    ₹449<span style={{ fontSize: '20px' }}>.00</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '11.5px', color: '#94a3b8', textDecoration: 'line-through', fontWeight: 600 }}>
                      ₹599.00
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#dc2626' }}>
                      SAVE 25%
                    </span>
                  </div>
                </div>
              </div>

              {/* Barcode / QR Simulation */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#ffffff',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                }}
              >
                {/* SVG Barcode */}
                <svg width="72" height="42" viewBox="0 0 72 42" fill="#0f172a">
                  <rect x="0" y="0" width="3" height="34" />
                  <rect x="5" y="0" width="2" height="34" />
                  <rect x="9" y="0" width="4" height="34" />
                  <rect x="15" y="0" width="1" height="34" />
                  <rect x="18" y="0" width="3" height="34" />
                  <rect x="23" y="0" width="2" height="34" />
                  <rect x="27" y="0" width="4" height="34" />
                  <rect x="33" y="0" width="2" height="34" />
                  <rect x="37" y="0" width="3" height="34" />
                  <rect x="42" y="0" width="1" height="34" />
                  <rect x="45" y="0" width="4" height="34" />
                  <rect x="51" y="0" width="2" height="34" />
                  <rect x="55" y="0" width="3" height="34" />
                  <rect x="60" y="0" width="2" height="34" />
                  <rect x="64" y="0" width="4" height="34" />
                  <rect x="70" y="0" width="2" height="34" />
                </svg>
                <span style={{ fontSize: '9px', fontWeight: 700, fontFamily: 'monospace', color: '#0f172a' }}>
                  8003152970
                </span>
              </div>
            </div>

            {/* Simulated Shelf Rail Mounting */}
            <div
              style={{
                marginTop: '14px',
                paddingTop: '8px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '10px',
                color: '#64748b',
                fontFamily: 'monospace',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                <span>SYNCED VIA AP #E43819636067</span>
              </div>
              <span style={{ fontWeight: 600 }}>ORG: CU006INDIA0344:483</span>
            </div>
          </div>

          {/* Real-time Telemetry Status Floating Badges */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '10px',
              marginTop: '20px',
              width: '100%',
              maxWidth: '480px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid rgba(51, 65, 85, 0.6)',
                backdropFilter: 'blur(8px)',
                fontSize: '11.5px',
                color: '#e2e8f0',
              }}
            >
              <Radio size={13} color="#38bdf8" />
              <span>Sub-GHz Multi-Channel RF</span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid rgba(51, 65, 85, 0.6)',
                backdropFilter: 'blur(8px)',
                fontSize: '11.5px',
                color: '#e2e8f0',
              }}
            >
              <BatteryCharging size={13} color="#10b981" />
              <span>5+ Year Coin-Cell Life</span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid rgba(51, 65, 85, 0.6)',
                backdropFilter: 'blur(8px)',
                fontSize: '11.5px',
                color: '#e2e8f0',
              }}
            >
              <Zap size={13} color="#fbbf24" />
              <span>Instantaneous POS Sync</span>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
            paddingTop: '20px',
            borderTop: '1px solid rgba(51, 65, 85, 0.4)',
          }}
        >
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#f1f5f9', marginBottom: '4px' }}>
              Sub-GHz Telemetry
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.4 }}>
              Autonomous RF transmission across 868/433 MHz with zero Wi-Fi interference.
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#f1f5f9', marginBottom: '4px' }}>
              Divergence Engine
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.4 }}>
              Automatic drift monitoring between POS prices and physical shelf tags.
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#f1f5f9', marginBottom: '4px' }}>
              Highlight IoT Native
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.4 }}>
              Direct carrier-grade gateway binding for APs and electronic tags.
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          RIGHT SIDE: CLEAN ENTERPRISE AUTHENTICATION FORM
      ========================================================================== */}
      <div
        style={{
          flex: '1 1 45%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 32px',
          position: 'relative',
          zIndex: 2,
          backgroundColor: '#0b1120',
          minWidth: '340px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '420px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Form Header */}
          <div style={{ marginBottom: '28px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: 'rgba(37, 99, 235, 0.12)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                marginBottom: '16px',
              }}
            >
              <img
                src={quickshelfIcon}
                alt="QuickShelf Icon"
                style={{ width: '28px', height: '28px', objectFit: 'contain' }}
              />
            </div>

            <h1
              style={{
                fontSize: '24px',
                fontWeight: 800,
                color: '#f8fafc',
                letterSpacing: '-0.02em',
                margin: '0 0 6px 0',
              }}
            >
              Welcome to QuickShelf
            </h1>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
              Sign in to manage your ESL price tags, base stations, and live catalogue.
            </p>
          </div>

          {/* Quick Demo Credentials Autofill Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(30, 41, 59, 0.6)',
              border: '1px solid #334155',
              marginBottom: '20px',
              fontSize: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} color="#60a5fa" />
              <span style={{ color: '#cbd5e1' }}>Demo Admin Login</span>
            </div>
            <button
              type="button"
              onClick={fillDemoCredentials}
              style={{
                backgroundColor: 'rgba(37, 99, 235, 0.2)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                color: '#93c5fd',
                fontSize: '11px',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: '5px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.2)';
              }}
            >
              Autofill Credentials
            </button>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                marginBottom: '20px',
                color: '#fca5a5',
                fontSize: '13px',
                lineHeight: 1.4,
                animation: 'dropdownFadeIn 0.2s ease-out',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{errorMessage}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#cbd5e1',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
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
                    color: '#64748b',
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
                  placeholder="admin@quickshelf.io"
                  required
                  style={{
                    width: '100%',
                    height: '44px',
                    paddingLeft: '38px',
                    paddingRight: '12px',
                    borderRadius: '8px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    color: '#f8fafc',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#334155';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#cbd5e1',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Password
                </label>
              </div>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#64748b',
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
                    height: '44px',
                    paddingLeft: '38px',
                    paddingRight: '40px',
                    borderRadius: '8px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    color: '#f8fafc',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#334155';
                    e.currentTarget.style.boxShadow = 'none';
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
                height: '46px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '8px',
                opacity: isLoading ? 0.8 : 1,
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                transition: 'background-color 0.2s, transform 0.1s',
              }}
              onMouseEnter={(e) => {
                if (!isLoading) e.currentTarget.style.backgroundColor = '#1d4ed8';
              }}
              onMouseLeave={(e) => {
                if (!isLoading) e.currentTarget.style.backgroundColor = '#2563eb';
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="anim-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to QuickShelf</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Security & Compliance Footer */}
          <div
            style={{
              marginTop: '32px',
              paddingTop: '20px',
              borderTop: '1px solid #1e293b',
              fontSize: '11px',
              color: '#64748b',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              textAlign: 'center',
              lineHeight: 1.4,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#94a3b8' }}>
              <CheckCircle2 size={12} color="#10b981" />
              <span>TLS 1.3 End-to-End Encryption • RBAC Role Enforcement</span>
            </div>
            <div>
              QuickShelf Cloud Manager © 2026. Unauthorized access attempts are monitored and recorded.
            </div>
          </div>
        </div>
      </div>

      {/* Responsive CSS for Mobile / Small Screens */}
      <style>{`
        @media (max-width: 900px) {
          .login-illustration-panel {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
