import React, { useState } from 'react';

// ============================================================
// WellMind Brand Palette
// Primary Purple: #623068 | Dark: #331B3F | Mid: #47234F
// Secondary Red: #8A1C37 | Action Teal: #0D7289
// Accent Gold: #C0854A | Main BG: #F5F0E5 | Dark BG: #1A1228
// Text Main: #2D1B38 | Text Light: #F0EAF8
// ============================================================

const Signup = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    setLoading(true);

    try {
    // .env file se URL read karein
   const backendUrl = import.meta.env.VITE_BACKEND_URL; 
   const hfToken = import.meta.env.VITE_HF_TOKEN; // ✅

   
    const response = await fetch(`${backendUrl}/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${hfToken}`
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
  

      if (response.ok) {
        alert("Account Created Successfully! Please Login.");
        onNavigate('login');
      } else {
        alert(data.detail || "Signup failed. Please try again.");
      }
    } catch (error) {
      alert("Could not connect to the backend server.");
    } finally {
      setLoading(false);
    }
  };

  const focusStyle = (e) => { e.target.style.borderColor = '#0D7289'; e.target.style.boxShadow = '0 0 0 3px rgba(13,114,137,0.1)'; };
  const blurStyle  = (e) => { e.target.style.borderColor = 'rgba(192,133,74,0.35)'; e.target.style.boxShadow = 'none'; };

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.circle1}></div>
      <div style={styles.circle2}></div>
      <div style={styles.circle3}></div>

      <div style={styles.loginCard}>
        <div style={styles.headerSection}>
          <div style={styles.logoIcon}>
           <img 
    src="./hero.png" 
    alt="WellMind Data Solutions" 
    style={{ 
        height: '40px', 
        width: 'auto', 
        objectFit: 'contain',
        backgroundColor: '#FFFFFF', // White background
        padding: '4px',             // Thodi si space logo ke charon taraf
        borderRadius: '4px'         // Optional: kinaro ko thora round karne ke liye
    }} 
/>
          </div>
          <h1 style={styles.brandTitle}>WellMind</h1>
          <p style={styles.brandSub}>Data Solutions</p>
          <p style={styles.subTitle}>Create Your Account</p>
        </div>

        <form onSubmit={handleSignup} style={styles.form}>
          {/* Email */}
          <div style={styles.inputWrapper}>
            <svg style={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
            </svg>
            <input
              type="email"
              placeholder="Email Address"
              required
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              onFocus={focusStyle}
              onBlur={blurStyle}
            />
          </div>

          {/* Password */}
          <div style={styles.inputWrapper}>
            <svg style={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <input
              type="password"
              placeholder="Create Password"
              required
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              onFocus={focusStyle}
              onBlur={blurStyle}
            />
          </div>

          {/* Confirm Password */}
          <div style={styles.inputWrapper}>
            <svg style={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <input
              type="password"
              placeholder="Confirm Password"
              required
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={styles.input}
              onFocus={focusStyle}
              onBlur={blurStyle}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ ...styles.button, opacity: loading ? 0.75 : 1 }}
            onMouseOver={e => { if (!loading) e.currentTarget.style.background = 'linear-gradient(90deg, #47234F 0%, #8A1C37 100%)'; }}
            onMouseOut={e => { if (!loading) e.currentTarget.style.background = 'linear-gradient(90deg, #623068 0%, #8A1C37 100%)'; }}
          >
            {loading ? "Creating Account..." : "Register Now"}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Already have an account?
            <button onClick={() => onNavigate('login')} style={styles.linkBtn}>
              Login here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  pageWrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1A1228 0%, #331B3F 50%, #47234F 100%)',
    fontFamily: "'Poppins', sans-serif",
    position: 'relative',
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute',
    width: '420px',
    height: '420px',
    borderRadius: '50%',
    background: 'rgba(138, 28, 55, 0.2)',
    top: '-160px',
    right: '-100px',
    filter: 'blur(2px)',
  },
  circle2: {
    position: 'absolute',
    width: '320px',
    height: '320px',
    borderRadius: '50%',
    background: 'rgba(13, 114, 137, 0.2)',
    bottom: '-100px',
    left: '-60px',
    filter: 'blur(2px)',
  },
  circle3: {
    position: 'absolute',
    width: '200px',
    height: '200px',
    borderRadius: '50%',
    background: 'rgba(192, 133, 74, 0.12)',
    top: '35%',
    left: '8%',
  },
  loginCard: {
    backgroundColor: 'rgba(245, 240, 229, 0.97)',
    padding: '48px 40px',
    borderRadius: '24px',
    boxShadow: '0 24px 60px rgba(26, 18, 40, 0.5)',
    width: '100%',
    maxWidth: '420px',
    textAlign: 'center',
    border: '1px solid rgba(192, 133, 74, 0.3)',
    zIndex: 10,
  },
  headerSection: {
    marginBottom: '32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  logoIcon: {
    width: '58px',
    height: '58px',
     background: 'linear-gradient(135deg, #e8b3ee 0%, #250236 100%)',
    borderRadius: '16px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '12px',
    boxShadow: '0 6px 20px rgba(138, 28, 55, 0.35)',
  },
  brandTitle: {
    fontSize: '26px',
    fontWeight: '800',
    color: '#2D1B38',
    margin: '0',
    letterSpacing: '-0.5px',
  },
  brandSub: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#0D7289',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    margin: '2px 0 6px',
  },
  subTitle: {
    fontSize: '13px',
    color: '#623068',
    margin: '0',
    fontWeight: '500',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '15px',
    width: '18px',
    height: '18px',
    color: '#623068',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    padding: '14px 14px 14px 48px',
    borderRadius: '12px',
    border: '1.5px solid rgba(192, 133, 74, 0.35)',
    backgroundColor: '#fff',
    fontSize: '14px',
    color: '#2D1B38',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    fontFamily: "'Poppins', sans-serif",
  },
  button: {
    width: '100%',
    padding: '15px',
    background: 'linear-gradient(90deg, #623068 0%, #8A1C37 100%)',
    color: '#F0EAF8',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '8px',
    boxShadow: '0 8px 24px rgba(138, 28, 55, 0.3)',
    transition: 'all 0.2s ease',
    fontFamily: "'Poppins', sans-serif",
    letterSpacing: '0.5px',
  },
  footer: {
    marginTop: '28px',
    borderTop: '1px solid rgba(98, 48, 104, 0.15)',
    paddingTop: '20px',
  },
  footerText: {
    fontSize: '14px',
    color: '#47234F',
    margin: '0',
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: '#0D7289',
    fontWeight: '700',
    cursor: 'pointer',
    marginLeft: '6px',
    fontFamily: "'Poppins', sans-serif",
    fontSize: '14px',
    textDecoration: 'underline',
  },
};

export default Signup;