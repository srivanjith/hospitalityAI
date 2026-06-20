import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Lock, 
  Mail, 
  Hotel, 
  HelpCircle, 
  Eye, 
  EyeOff,
  ShieldCheck,
  RefreshCw,
  ArrowLeft,
  Timer,
  CheckCircle,
  User,
  Loader2
} from 'lucide-react';
import api from '../services/api';
import { generateOTP } from '../utils/otpGenerator';
import { sendOTPEmail } from '../services/emailService';

const Login = () => {
  const { completeLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  
  // OTP Flow States
  const [step, setStep] = useState('credentials'); // 'credentials' | 'otp' | 'signup'
  const [otpInput, setOtpInput] = useState(['', '', '', '', '', '']);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpTimeRemaining, setOtpTimeRemaining] = useState(300); // 5 minutes in seconds
  const [resendTimer, setResendTimer] = useState(0); // 30-second cooldown
  const [tempLoginData, setTempLoginData] = useState(null);
  const [otpError, setOtpError] = useState(null);
  const [otpSuccess, setOtpSuccess] = useState(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // New Sign Up and Google Auth States
  const [name, setName] = useState('');
  const [otpPurpose, setOtpPurpose] = useState('login'); // 'login' | 'register'
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // References for OTP input elements
  const inputRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null)
  ];

  // Forgot Password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  // State for Reset Password Flow
  const [resetToken, setResetToken] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetStatus, setResetStatus] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      setResetToken(token);
      setStep('reset');
    }
  }, []);

  // Handle countdown timers
  useEffect(() => {
    let interval = null;
    if (step === 'otp') {
      interval = setInterval(() => {
        // Decrement resend cooldown
        setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
        
        // Decrement OTP validity countdown
        setOtpTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setOtpError('Verification code has expired. Please click "Resend OTP".');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, generatedOtp]);

  // Format seconds to MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Step 1: Submit Credentials & Request OTP
  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setIsLoading(true);
    setErrorMsg(null);
    setOtpError(null);
    setOtpSuccess(null);
    setOtpPurpose('login');

    try {
      // 1. Verify credentials against backend login endpoint
      const loginData = await api.login(email, password);
      
      // 2. Credentials valid! Generate secure 6-digit OTP
      const otpCode = generateOTP();
      setGeneratedOtp(otpCode);
      setTempLoginData(loginData);
      
      // 3. Dispatch OTP via EmailJS
      setIsSendingOtp(true);
      await sendOTPEmail(loginData.email, otpCode, loginData.name);
      
      // 4. Transition UI states
      setOtpTimeRemaining(300); // Reset validity countdown to 5 mins
      setResendTimer(30);       // Trigger 30s resend cooldown throttle
      setStep('otp');
      setOtpInput(['', '', '', '', '', '']);
      setOtpSuccess('Secure verification code successfully sent to your email.');
    } catch (err) {
      setErrorMsg(err.message || 'Verification failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
      setIsSendingOtp(false);
    }
  };

  // Step 1b: Submit Registration & Request OTP
  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) return;

    setIsLoading(true);
    setErrorMsg(null);
    setOtpError(null);
    setOtpSuccess(null);
    setOtpPurpose('register');

    try {
      // 1. Generate secure 6-digit OTP
      const otpCode = generateOTP();
      setGeneratedOtp(otpCode);
      
      // Store temp signup info
      setTempLoginData({ name, email, password });

      // 2. Dispatch OTP via Email
      setIsSendingOtp(true);
      await sendOTPEmail(email.toLowerCase().trim(), otpCode, name);

      // 3. Transition UI states
      setOtpTimeRemaining(300); // Reset validity countdown to 5 mins
      setResendTimer(30);       // Trigger 30s resend cooldown throttle
      setStep('otp');
      setOtpInput(['', '', '', '', '', '']);
      setOtpSuccess('Secure registration code successfully sent to your email.');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to request signup verification.');
    } finally {
      setIsLoading(false);
      setIsSendingOtp(false);
    }
  };

  // Google Sign-In Simulation Handler
  const handleGoogleLogin = async (googleName, googleEmail) => {
    setIsGoogleLoading(true);
    setErrorMsg(null);
    setOtpError(null);
    setOtpSuccess(null);
    try {
      // 1. Check if email already exists in the database
      const checkRes = await api.checkEmail(googleEmail);
      
      if (checkRes.exists) {
        // 2. Email exists! Log them in directly
        const loginData = await api.googleLogin(googleName, googleEmail);
        setShowGoogleModal(false);
        completeLogin(loginData);
      } else {
        // 3. Email is new! Generate OTP and transition to OTP verification screen
        const otpCode = generateOTP();
        setGeneratedOtp(otpCode);
        
        // Random secure password for database register
        const randomPassword = Math.random().toString(36) + Math.random().toString(36);
        setTempLoginData({ 
          name: googleName, 
          email: googleEmail, 
          password: randomPassword,
          isGoogleLogin: true 
        });
        
        setOtpPurpose('register');
        setIsSendingOtp(true);
        await sendOTPEmail(googleEmail.toLowerCase().trim(), otpCode, googleName);
        
        // Transition UI states
        setShowGoogleModal(false);
        setOtpTimeRemaining(300); // 5 mins
        setResendTimer(30);
        setStep('otp');
        setOtpInput(['', '', '', '', '', '']);
        setOtpSuccess('Secure registration code successfully sent to your Google email.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Google Sign-In failed.');
    } finally {
      setIsGoogleLoading(false);
      setIsSendingOtp(false);
    }
  };

  // Step 2: Handle Verification code validation
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    const enteredCode = otpInput.join('');
    
    if (enteredCode.length !== 6) {
      setOtpError('Please input all 6 digits of the OTP code.');
      return;
    }
    
    if (otpTimeRemaining === 0) {
      setOtpError('Your OTP code has expired. Please request a new verification code.');
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError(null);

    // Simulate verification delay for rich UX
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (enteredCode === generatedOtp) {
      if (otpPurpose === 'register') {
        try {
          setOtpSuccess('OTP Verified! Registering account in MySQL...');
          const signupData = await api.register(
            tempLoginData.name, 
            tempLoginData.email, 
            tempLoginData.password, 
            tempLoginData.isGoogleLogin || false
          );
          setOtpSuccess('Account created! Entering Dashboard...');
          completeLogin(signupData);
        } catch (err) {
          setOtpError(err.message || 'Registration failed.');
          setIsVerifyingOtp(false);
        }
      } else {
        setOtpSuccess('OTP Verified! Entering Dashboard...');
        completeLogin(tempLoginData);
      }
    } else {
      setOtpError('Invalid OTP code. Please verify the code sent to your email.');
      setIsVerifyingOtp(false);
    }
  };

  // Action: Resend OTP Code
  const handleResendOTP = async () => {
    if (resendTimer > 0) return;

    setOtpError(null);
    setOtpSuccess(null);
    setIsSendingOtp(true);

    try {
      const otpCode = generateOTP();
      setGeneratedOtp(otpCode);
      
      const targetEmail = otpPurpose === 'register' ? tempLoginData.email : tempLoginData.email;
      const targetName = otpPurpose === 'register' ? tempLoginData.name : tempLoginData.name;
      
      await sendOTPEmail(targetEmail, otpCode, targetName);
      
      setOtpTimeRemaining(300); // Reset timer
      setResendTimer(30);       // Reset cooldown
      setOtpInput(['', '', '', '', '', '']);
      setOtpSuccess('A new verification code has been dispatched.');
      
      // Focus back on the first box
      if (inputRefs[0].current) inputRefs[0].current.focus();
    } catch (err) {
      setOtpError(err.message || 'Failed to dispatch new OTP.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // OTP Box keyboard/focus handlers
  const handleOtpChange = (index, value) => {
    if (value && !/^\d+$/.test(value)) return; // Strict numeric checks

    const newOtp = [...otpInput];
    // Grab the last typed char
    newOtp[index] = value.substring(value.length - 1);
    setOtpInput(newOtp);

    // Advance focus forward
    if (value && index < 5) {
      if (inputRefs[index + 1].current) {
        inputRefs[index + 1].current.focus();
      }
    }
  };

  const handleOtpKeyDown = (index, e) => {
    // Return backward on Backspace
    if (e.key === 'Backspace' && !otpInput[index] && index > 0) {
      const newOtp = [...otpInput];
      newOtp[index - 1] = '';
      setOtpInput(newOtp);
      
      if (inputRefs[index - 1].current) {
        inputRefs[index - 1].current.focus();
      }
    }
  };

  const handleDemoLogin = (role) => {
    if (role === 'guest') {
      setEmail('guest@gmail.com');
      setPassword('guest123');
    } else {
      setEmail('manager@hospitality.com');
      setPassword('manager123');
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return;
    
    setForgotLoading(true);
    setForgotStatus(null);
    try {
      const res = await api.forgotPassword(forgotEmail);
      setForgotStatus({ success: true, message: res.message });
      setForgotEmail('');
    } catch (err) {
      setForgotStatus({ success: false, message: err.message || 'Failed to request reset.' });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setResetStatus(null);

    if (!newPassword || !confirmPassword) {
      setResetStatus({ success: false, message: 'Please enter all fields.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetStatus({ success: false, message: 'Passwords do not match.' });
      return;
    }

    if (newPassword.length < 6) {
      setResetStatus({ success: false, message: 'Password must be at least 6 characters long.' });
      return;
    }

    setResetLoading(true);
    try {
      const res = await api.resetPassword(resetToken, newPassword);
      setResetStatus({ success: true, message: res.message });
      setNewPassword('');
      setConfirmPassword('');
      
      // Auto-redirect to credentials view after 3 seconds
      setTimeout(() => {
        setResetToken(null);
        setResetStatus(null);
        setStep('credentials');
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 3000);
    } catch (err) {
      setResetStatus({ success: false, message: err.message || 'Failed to update password.' });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070a13] font-sans relative overflow-hidden px-4 py-8">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
      >
        <source src="/login-bg.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className="absolute inset-0 bg-black/60 z-0 pointer-events-none"></div>

      {/* Decorative gradient glowing spheres */}
      <div className="absolute top-[-25%] left-[-25%] w-[70%] h-[70%] rounded-full bg-luxury-gold/5 blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-25%] right-[-25%] w-[70%] h-[70%] rounded-full bg-[#1e293b]/40 blur-[150px] pointer-events-none"></div>
      <div className="absolute top-[40%] left-[30%] w-[35%] h-[35%] rounded-full bg-[#aa7c11]/5 blur-[100px] pointer-events-none"></div>

      {/* Main container wrapper */}
      <div className="w-full max-w-md md:max-w-5xl md:grid md:grid-cols-12 bg-[#101625]/60 border border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl animate-fade-in relative">
        
        {/* Left Column: Premium Brand & Feature Showcase (Desktop only) */}
        <div className="hidden md:flex md:col-span-6 flex-col justify-between p-12 bg-gradient-to-br from-[#080b13] via-[#0f1524] to-[#1d170d] border-r border-slate-800/50 relative overflow-hidden">
          {/* Subtle background abstract shapes */}
          <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-luxury-gold/5 blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full bg-slate-950/45 blur-3xl pointer-events-none"></div>
          
          {/* Top Branding */}
          <div className="relative z-10 flex items-center space-x-2.5">
            <Hotel className="h-6 w-6 text-luxury-gold" />
            <div>
              <h2 className="text-sm font-bold tracking-widest font-serif text-white uppercase leading-none">
                THE GRAND ROYAL
              </h2>
              <span className="text-[8px] uppercase tracking-widest text-luxury-gold font-bold">Our Resort Our Pride</span>
            </div>
          </div>

          {/* Middle Visual/Feature Highlight */}
          <div className="relative z-10 space-y-6 my-auto pt-8">
            <span className="text-[10px] font-bold text-luxury-gold uppercase tracking-widest bg-luxury-gold/10 px-3 py-1 rounded-full border border-luxury-gold/20 inline-block font-mono">
              welcome ! 😀
            </span>
            <h3 className="text-3xl font-serif font-bold text-white leading-tight">
              Where Heritage Meets <br/>Modern Luxury.
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Indulge in a premium retreat nestled amidst the serene landscapes of Sathyamangalam. Experience world-class hospitality, curated dining, and absolute relaxation at Erode's premier luxury resort.
            </p>
            
            {/* Quick mini-metrics grid */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="p-3.5 bg-white/[0.02] border border-white/[0.05] rounded-xl backdrop-blur-md">
                <span className="text-xl font-bold font-serif text-luxury-gold block">500</span>
                <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Luxury Suites</span>
              </div>
              <div className="p-3.5 bg-white/[0.02] border border-white/[0.05] rounded-xl backdrop-blur-md">
                <span className="text-xl font-bold font-serif text-luxury-gold block">5 ★</span>
                <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Guest Experience</span>
              </div>
            </div>
          </div>

          {/* Bottom Quote */}
          <div className="relative z-10 border-t border-slate-800/80 pt-6">
            <p className="text-xs italic text-slate-350 leading-relaxed font-serif">
              "True hospitality consists of giving the best of yourself to your guests. Welcome to a sanctuary designed to soothe your mind and body."
            </p>
            <span className="text-[10px] text-luxury-gold uppercase tracking-widest font-semibold block mt-2 font-mono">
              — powered by THE GRAND ROYAL
            </span>
          </div>
        </div>

        {/* Right Column: Form Container */}
        <div className="col-span-12 md:col-span-6 p-8 md:p-12 flex flex-col justify-center bg-luxury-darkCard/20 relative">
          
          {/* Mobile Brand Header (only visible on mobile) */}
          <div className="text-center mb-8 md:hidden">
            <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-luxury-gold via-amber-500 to-luxury-goldDark rounded-full mb-3 shadow-glow">
              <Hotel className="h-6 w-6 text-luxury-navy" />
            </div>
            <h1 className="text-xl font-bold tracking-wider font-serif text-white">
              THE GRAND ROYAL
            </h1>
            <p className="text-[9px] text-luxury-gold font-bold uppercase tracking-widest mt-0.5 font-mono">Predictive Guest Optimization</p>
          </div>

          {/* Desktop Form Title */}
          <div className="hidden md:block mb-8">
            <h2 className="text-2xl font-bold font-serif text-white tracking-wide">
              {step === 'reset' 
                ? 'Set New Password' 
                : step === 'credentials' 
                ? 'Access Control Vault' 
                : step === 'signup' 
                ? 'Create Resident Account' 
                : 'Identity Verification'}
            </h2>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              {step === 'reset'
                ? 'Enter and confirm your new account password below'
                : step === 'credentials' 
                ? 'Sign in to access your resort administration tools' 
                : step === 'signup'
                ? 'Sign up for a resident guest account'
                : 'Confirm identity using the OTP code sent to your email'}
            </p>
          </div>

          {/* Global Credentials/Signup Error */}
          {errorMsg && (step === 'credentials' || step === 'signup') && (
            <div className="p-3.5 mb-6 bg-red-950/20 border border-red-500/20 text-red-400 rounded-lg text-xs flex items-center space-x-2.5 animate-fade-in">
              <HelpCircle className="h-4.5 w-4.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Step 0: RESET PASSWORD VIEW */}
          {step === 'reset' && (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4 animate-fade-in">
              {resetStatus && (
                <div className={`p-3.5 rounded-lg text-xs border ${
                  resetStatus.success 
                    ? 'bg-emerald-950/25 border-emerald-500/20 text-emerald-400' 
                    : 'bg-red-950/20 border-red-500/20 text-red-400'
                }`}>
                  {resetStatus.message}
                </div>
              )}

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#0a0e1a]/60 border border-slate-800/80 text-white rounded-xl pl-11 pr-4 py-3 text-xs focus:border-luxury-gold focus:outline-none transition-all duration-200 focus:shadow-glow/10"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#0a0e1a]/60 border border-slate-800/80 text-white rounded-xl pl-11 pr-4 py-3 text-xs focus:border-luxury-gold focus:outline-none transition-all duration-200 focus:shadow-glow/10"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={resetLoading}
                className="w-full bg-gradient-to-r from-luxury-gold to-[#aa7c11] hover:from-luxury-goldLight hover:to-[#c59b27] text-white py-3 rounded-xl text-xs font-bold transition-all duration-200 hover:shadow-glow/20 disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-2"
              >
                {resetLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <span>Update Password</span>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setResetToken(null);
                    setStep('credentials');
                    window.history.replaceState({}, document.title, window.location.pathname);
                  }}
                  className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Back to Login
                </button>
              </div>
            </form>
          )}

          {/* Step 1: CREDENTIALS VIEW */}
          {step === 'credentials' && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500 transition-colors" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="hotelmanager@grandroyal.com"
                    className="w-full bg-[#0a0e1a]/60 border border-slate-800/80 text-white rounded-lg pl-11 pr-4 py-3 text-xs focus:border-luxury-gold focus:outline-none transition-all duration-200 focus:shadow-glow/10"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Security Password</label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-[10px] text-luxury-gold hover:underline cursor-pointer font-semibold"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500 transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#0a0e1a]/60 border border-slate-800/80 text-white rounded-lg pl-11 pr-11 py-3 text-xs focus:border-luxury-gold focus:outline-none transition-all duration-200 focus:shadow-glow/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-500 hover:text-white cursor-pointer transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || isSendingOtp}
                className="w-full bg-gradient-to-r from-luxury-gold via-yellow-500 to-luxury-goldDark text-luxury-navy hover:shadow-glow/30 font-bold py-3 px-4 rounded-lg shadow-glow hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center space-x-2 text-xs uppercase tracking-wider"
              >
                {isLoading || isSendingOtp ? (
                  <>
                    <RefreshCw className="h-4.5 w-4.5 animate-spin text-luxury-navy" />
                    <span>{isSendingOtp ? 'Sending OTP Security Code...' : 'Verifying Vault Credentials...'}</span>
                  </>
                ) : (
                  <span>Send Verification OTP</span>
                )}
              </button>

              {/* Continue with Google button */}
              <button
                type="button"
                onClick={() => setShowGoogleModal(true)}
                className="w-full bg-white text-slate-900 font-bold py-3 px-4 rounded-lg hover:bg-slate-100 transition-all duration-300 flex items-center justify-center space-x-2.5 text-xs uppercase tracking-wider border border-slate-300 cursor-pointer"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.58h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.4C21.68,11.77 21.56,11.41 21.35,11.1z" fill="#4285F4" />
                  <path d="M12,20.82c2.43,0 4.47,-0.8 5.96,-2.19l-3.3,-2.58c-0.9,0.6 -2.07,0.97 -3.27,0.97 -2.35,0 -4.33,-1.58 -5.04,-3.72H2.94v2.66C4.43,18.91 8.01,20.82 12,20.82z" fill="#34A853" />
                  <path d="M6.96,13.3c-0.18,-0.54 -0.28,-1.11 -0.28,-1.7s0.1,-1.16 0.28,-1.7V7.24H2.94C2.33,8.47 2,9.85 2,11.3s0.33,2.83 0.94,4.06l4.02,-3.06z" fill="#FBBC05" />
                  <path d="M12,6.48c1.33,0 2.51,0.46 3.45,1.35l2.58,-2.58C16.47,3.67 14.43,2.82 12,2.82c-3.99,0 -7.57,1.91 -9.06,4.42l4.02,3.06c0.71,-2.14 2.69,-3.72 5.04,-3.72z" fill="#EA4335" />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="text-center mt-3 pt-1">
                <span className="text-xs text-slate-400">New to the resort? </span>
                <button
                  type="button"
                  onClick={() => { setStep('signup'); setErrorMsg(null); }}
                  className="text-xs text-luxury-gold hover:underline cursor-pointer font-bold bg-transparent border-none focus:outline-none"
                >
                  Create an Account
                </button>
              </div>
            </form>
          )}

          {/* Step 1b: SIGNUP VIEW */}
          {step === 'signup' && (
            <form onSubmit={handleSignUpSubmit} className="space-y-4 animate-fade-in">
              {/* Name Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Sri Vanjith T"
                    className="w-full bg-[#0a0e1a]/60 border border-slate-800/80 text-white rounded-lg pl-11 pr-4 py-3 text-xs focus:border-luxury-gold focus:outline-none transition-all duration-200 focus:shadow-glow/10"
                  />
                </div>
              </div>

              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="srivanjith@gmail.com"
                    className="w-full bg-[#0a0e1a]/60 border border-slate-800/80 text-white rounded-lg pl-11 pr-4 py-3 text-xs focus:border-luxury-gold focus:outline-none transition-all duration-200 focus:shadow-glow/10"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Security Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#0a0e1a]/60 border border-slate-800/80 text-white rounded-lg pl-11 pr-11 py-3 text-xs focus:border-luxury-gold focus:outline-none transition-all duration-200 focus:shadow-glow/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-500 hover:text-white cursor-pointer transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || isSendingOtp}
                className="w-full bg-gradient-to-r from-luxury-gold via-yellow-500 to-luxury-goldDark text-luxury-navy hover:shadow-glow/30 font-bold py-3 px-4 rounded-lg shadow-glow hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center space-x-2 text-xs uppercase tracking-wider"
              >
                {isLoading || isSendingOtp ? (
                  <>
                    <RefreshCw className="h-4.5 w-4.5 animate-spin text-luxury-navy" />
                    <span>{isSendingOtp ? 'Sending OTP Security Code...' : 'Requesting Signup...'}</span>
                  </>
                ) : (
                  <span>Verify Email via OTP</span>
                )}
              </button>

              <div className="text-center mt-3 pt-1">
                <span className="text-xs text-slate-400">Already have an account? </span>
                <button
                  type="button"
                  onClick={() => { setStep('credentials'); setErrorMsg(null); }}
                  className="text-xs text-luxury-gold hover:underline cursor-pointer font-bold bg-transparent border-none focus:outline-none"
                >
                  Sign In
                </button>
              </div>
            </form>
          )}

          {/* Step 2: OTP VERIFICATION VIEW */}
          {step === 'otp' && (
            <div className="space-y-6 animate-fade-in">
              {/* Context message */}
              <div className="text-center md:text-left">
                <div className="inline-flex p-2.5 bg-luxury-gold/10 border border-luxury-gold/20 rounded-full mb-3">
                  <ShieldCheck className="h-5 w-5 text-luxury-gold" />
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider hidden md:block">Identity Verification</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  A verification code has been dispatched to <span className="text-luxury-gold font-mono font-bold">{tempLoginData?.email}</span>.
                </p>
              </div>

              {/* OTP Status alerts */}
              {otpSuccess && (
                <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs flex items-center space-x-2 animate-fade-in">
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{otpSuccess}</span>
                </div>
              )}
              
              {otpError && (
                <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 rounded-lg text-xs flex items-center space-x-2 animate-fade-in">
                  <HelpCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{otpError}</span>
                </div>
              )}

              {/* OTP Split Box Inputs */}
              <form onSubmit={handleVerifyOTP} className="space-y-6">
                <div className="flex justify-between items-center space-x-2 px-1">
                  {otpInput.map((val, index) => (
                    <input
                      key={index}
                      ref={inputRefs[index]}
                      id={`otp-input-${index}`}
                      type="text"
                      pattern="[0-9]*"
                      inputMode="numeric"
                      maxLength={1}
                      value={val}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-11 h-11 md:w-12 md:h-12 bg-[#0a0e1a]/60 border border-slate-800 focus:border-luxury-gold text-white text-center text-lg font-bold rounded-lg focus:outline-none focus:ring-1 focus:ring-luxury-gold transition-all duration-200 font-mono focus:shadow-glow/20"
                    />
                  ))}
                </div>

                {/* Countdown expiration timer */}
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <div className="flex items-center space-x-1.5 font-mono">
                    <Timer className={`h-4.5 w-4.5 ${otpTimeRemaining < 60 ? 'text-rose-500 animate-pulse' : 'text-luxury-gold'}`} />
                    <span className={otpTimeRemaining < 60 ? 'text-rose-500 font-bold' : 'text-slate-350'}>
                      Code Expires: {formatTime(otpTimeRemaining)}
                    </span>
                  </div>

                  {/* Resend button */}
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={resendTimer > 0 || isSendingOtp}
                    className="text-luxury-gold hover:underline font-semibold flex items-center space-x-1 cursor-pointer disabled:opacity-50 disabled:no-underline text-xs"
                  >
                    {isSendingOtp && <RefreshCw className="h-3 w-3 animate-spin mr-1 text-luxury-gold" />}
                    <span>{resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}</span>
                  </button>
                </div>

                {/* Submit / Verification trigger button */}
                <button
                  type="submit"
                  disabled={isVerifyingOtp}
                  className="w-full bg-gradient-to-r from-luxury-gold via-yellow-500 to-luxury-goldDark text-luxury-navy font-bold py-3.5 px-4 rounded-lg shadow-glow hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center space-x-2 text-xs uppercase tracking-wider"
                >
                  {isVerifyingOtp ? (
                    <>
                      <RefreshCw className="h-4.5 w-4.5 animate-spin text-luxury-navy" />
                      <span>{otpPurpose === 'register' ? 'Registering Account...' : 'Verifying Secure OTP...'}</span>
                    </>
                  ) : (
                    <span>{otpPurpose === 'register' ? 'Verify OTP & Create Account' : 'Verify OTP & Access System'}</span>
                  )}
                </button>

                {/* Navigation Back Link */}
                <button
                  type="button"
                  onClick={() => {
                    setStep(otpPurpose === 'register' ? 'signup' : 'credentials');
                    setOtpError(null);
                    setOtpSuccess(null);
                  }}
                  className="w-full flex items-center justify-center space-x-2 text-xs text-slate-500 hover:text-slate-300 transition-colors py-2 cursor-pointer font-medium bg-transparent border-none focus:outline-none"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Return to Credentials Form</span>
                </button>
              </form>
            </div>
          )}

          {/* Demo Fast Login */}
          {(step === 'credentials' || step === 'signup') && (
            <div className="mt-6 pt-5 border-t border-slate-800/80">
              <p className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest mb-3 font-mono">
                System Quick Access Controls
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleDemoLogin('guest')}
                  className="bg-[#121927]/60 border border-slate-800/80 text-luxury-goldLight hover:border-luxury-gold/30 hover:bg-[#121927]/90 transition-all duration-200 py-2.5 px-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center cursor-pointer hover:shadow-md"
                >
                  <span className="text-white">Guest portal</span>
                  <span className="text-[8px] text-slate-500 font-normal mt-0.5 font-mono">Guest login here</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoLogin('manager')}
                  className="bg-[#121927]/60 border border-slate-800/80 text-sky-400 hover:border-sky-500/20 hover:bg-[#121927]/90 transition-all duration-200 py-2.5 px-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center cursor-pointer hover:shadow-md"
                >
                  <span className="text-white">management portal</span>
                  <span className="text-[8px] text-slate-500 font-normal mt-0.5 font-mono">only for management </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm bg-gradient-to-br from-luxury-darkCard to-[#0c101a] border border-slate-800 rounded-2xl p-6 relative animate-fade-in shadow-2xl">
            <h3 className="text-md font-bold font-serif text-white mb-2">Request Password Reset</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Enter the email address of your registered account, and we will simulate sending reset instructions.
            </p>

            {forgotStatus && (
              <div className={`p-3 mb-4 rounded-lg text-xs border ${
                forgotStatus.success 
                  ? 'bg-emerald-950/25 border-emerald-500/20 text-emerald-400' 
                  : 'bg-red-950/20 border-red-500/20 text-red-400'
              }`}>
                {forgotStatus.message}
              </div>
            )}

            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <input
                type="email"
                required
                placeholder="manager@hospitality.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="w-full bg-[#0a0e1a]/60 border border-slate-800/80 text-white rounded-lg px-4 py-2.5 text-xs focus:border-luxury-gold focus:outline-none transition-all duration-200 focus:shadow-glow/10"
              />
              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(false);
                    setForgotStatus(null);
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-slate-400 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-luxury-gold text-luxury-navy hover:shadow-glow/20 cursor-pointer disabled:opacity-50 transition-all duration-200"
                >
                  {forgotLoading ? 'Processing...' : 'Send Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Simulated Google Sign-In Selector Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm bg-[#0c101a] border border-slate-800 rounded-3xl p-6 relative animate-fade-in shadow-2xl space-y-6">
            <div className="text-center">
              <svg className="h-8 w-8 mx-auto mb-2" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                <g transform="matrix(1, 0, 0, 1, 0, 0)">
                  <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.58h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.4C21.68,11.77 21.56,11.41 21.35,11.1z" fill="#4285F4" />
                  <path d="M12,20.82c2.43,0 4.47,-0.8 5.96,-2.19l-3.3,-2.58c-0.9,0.6 -2.07,0.97 -3.27,0.97 -2.35,0 -4.33,-1.58 -5.04,-3.72H2.94v2.66C4.43,18.91 8.01,20.82 12,20.82z" fill="#34A853" />
                  <path d="M6.96,13.3c-0.18,-0.54 -0.28,-1.11 -0.28,-1.7s0.1,-1.16 0.28,-1.7V7.24H2.94C2.33,8.47 2,9.85 2,11.3s0.33,2.83 0.94,4.06l4.02,-3.06z" fill="#FBBC05" />
                  <path d="M12,6.48c1.33,0 2.51,0.46 3.45,1.35l2.58,-2.58C16.47,3.67 14.43,2.82 12,2.82c-3.99,0 -7.57,1.91 -9.06,4.42l4.02,3.06c0.71,-2.14 2.69,-3.72 5.04,-3.72z" fill="#EA4335" />
                </g>
              </svg>
              <h3 className="text-md font-bold font-serif text-white">Sign in with Google</h3>
              <p className="text-[11px] text-slate-400 mt-1">Choose a mock account to access The Grand Royal Resort</p>
            </div>

            {isGoogleLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="h-8 w-8 text-luxury-gold animate-spin" />
                <span className="text-xs text-slate-400">Connecting Google services...</span>
              </div>
            ) : (
              <div className="space-y-3.5">
                {/* Account 1 */}
                <button
                  type="button"
                  onClick={() => handleGoogleLogin("Sri Vanjith T", "srivanjith@gmail.com")}
                  className="w-full flex items-center space-x-3.5 p-3 rounded-xl bg-white/[0.02] border border-slate-800 hover:border-luxury-gold/30 hover:bg-white/[0.04] transition-all text-left cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-luxury-gold/15 flex items-center justify-center text-luxury-gold font-serif text-sm font-bold">
                    S
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Sri Vanjith T</span>
                    <span className="text-[10px] text-slate-550 font-mono">srivanjith@gmail.com</span>
                  </div>
                </button>

                {/* Account 2 */}
                <button
                  type="button"
                  onClick={() => handleGoogleLogin("Resident Guest", "guest@gmail.com")}
                  className="w-full flex items-center space-x-3.5 p-3 rounded-xl bg-white/[0.02] border border-slate-800 hover:border-luxury-gold/30 hover:bg-white/[0.04] transition-all text-left cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-luxury-gold/15 flex items-center justify-center text-luxury-gold font-serif text-sm font-bold">
                    R
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Resident Guest</span>
                    <span className="text-[10px] text-slate-550 font-mono">guest@gmail.com</span>
                  </div>
                </button>

                {/* Account 3: Custom Add */}
                <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
                  <span className="text-[9px] font-bold text-slate-550 uppercase tracking-widest block font-mono">Use another email</span>
                  <input
                    type="text"
                    placeholder="Your Name"
                    value={customGoogleName}
                    onChange={(e) => setCustomGoogleName(e.target.value)}
                    className="w-full bg-[#04060c] border border-slate-800 text-white rounded-lg px-3.5 py-2 text-xs focus:border-luxury-gold focus:outline-none transition-all"
                  />
                  <input
                    type="email"
                    placeholder="gmail@google.com"
                    value={customGoogleEmail}
                    onChange={(e) => setCustomGoogleEmail(e.target.value)}
                    className="w-full bg-[#04060c] border border-slate-800 text-white rounded-lg px-3.5 py-2 text-xs focus:border-luxury-gold focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    disabled={!customGoogleName || !customGoogleEmail}
                    onClick={() => handleGoogleLogin(customGoogleName, customGoogleEmail)}
                    className="w-full bg-luxury-gold text-luxury-navy font-bold py-2.5 rounded-lg text-xs tracking-wider uppercase cursor-pointer disabled:opacity-40"
                  >
                    Select Account
                  </button>
                </div>

                <div className="flex justify-end pt-3 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setShowGoogleModal(false)}
                    className="px-4 py-2 rounded-lg text-xs font-bold text-slate-400 hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
