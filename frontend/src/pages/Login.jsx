import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  BrainCircuit, 
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
  CheckCircle
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
  const [step, setStep] = useState('credentials'); // 'credentials' | 'otp'
  const [otpInput, setOtpInput] = useState(['', '', '', '', '', '']);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpTimeRemaining, setOtpTimeRemaining] = useState(300); // 5 minutes in seconds
  const [resendTimer, setResendTimer] = useState(0); // 30-second cooldown
  const [tempLoginData, setTempLoginData] = useState(null);
  const [otpError, setOtpError] = useState(null);
  const [otpSuccess, setOtpSuccess] = useState(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

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
      setOtpSuccess('OTP Verified! Entering Dashboard...');
      // Allow access by writing token and updating global state
      completeLogin(tempLoginData);
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
      
      await sendOTPEmail(tempLoginData.email, otpCode, tempLoginData.name);
      
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-luxury-dark font-sans relative overflow-hidden px-4">
      {/* Visual background accents */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-luxury-gold/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-[#1e293b]/30 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-luxury-darkCard/80 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-xl animate-fade-in relative">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-luxury-gold to-luxury-goldDark rounded-full mb-3 shadow-glow">
            <Hotel className="h-7 w-7 text-luxury-dark" />
          </div>
          <h1 className="text-2xl font-bold tracking-wider font-serif text-white">
            Hospitality<span className="text-luxury-gold">AI</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">Predictive Guest Optimization System</p>
        </div>

        {/* Global Credentials Error */}
        {step === 'credentials' && errorMsg && (
          <div className="p-3 mb-6 bg-red-950/20 border border-red-500/20 text-red-400 rounded-lg text-sm flex items-center space-x-2 animate-fade-in">
            <HelpCircle className="h-4 w-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Step 1: CREDENTIALS VIEW */}
        {step === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-4.5 w-4.5 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="hotelmanager@grandroyal.com"
                  className="w-full bg-luxury-dark border border-slate-800 text-white rounded-lg pl-10 pr-4 py-3 text-sm focus:border-luxury-gold focus:outline-none transition-colors duration-200"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Security Password</label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs text-luxury-gold hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-4.5 w-4.5 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-luxury-dark border border-slate-800 text-white rounded-lg pl-10 pr-10 py-3 text-sm focus:border-luxury-gold focus:outline-none transition-colors duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-slate-500 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || isSendingOtp}
              className="w-full bg-gradient-to-r from-luxury-gold to-luxury-goldDark text-luxury-navy font-bold py-3 px-4 rounded-lg shadow-glow hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center space-x-2"
            >
              {isLoading || isSendingOtp ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>{isSendingOtp ? 'Sending OTP Security Code...' : 'Verifying Vault Credentials...'}</span>
                </>
              ) : (
                <span>Send Verification OTP</span>
              )}
            </button>
          </form>
        )}

        {/* Step 2: OTP VERIFICATION VIEW */}
        {step === 'otp' && (
          <div className="space-y-6 animate-fade-in">
            {/* Context message */}
            <div className="text-center">
              <div className="inline-flex p-2 bg-luxury-gold/10 border border-luxury-gold/20 rounded-full mb-2">
                <ShieldCheck className="h-5 w-5 text-luxury-gold" />
              </div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Identity Verification</h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                A verification code has been dispatched to <span className="text-luxury-gold font-mono">{tempLoginData?.email}</span>.
              </p>
            </div>

            {/* OTP Status alerts */}
            {otpSuccess && (
              <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                <span>{otpSuccess}</span>
              </div>
            )}
            
            {otpError && (
              <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 rounded-lg text-xs flex items-center space-x-2">
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
                    className="w-12 h-12 bg-luxury-dark border border-slate-800 focus:border-luxury-gold text-white text-center text-lg font-bold rounded-lg focus:outline-none focus:ring-1 focus:ring-luxury-gold transition-colors duration-200 font-mono"
                  />
                ))}
              </div>

              {/* Countdown expiration timer */}
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <div className="flex items-center space-x-1.5 font-mono">
                  <Timer className={`h-4 w-4 ${otpTimeRemaining < 60 ? 'text-rose-500 animate-pulse' : 'text-luxury-gold'}`} />
                  <span className={otpTimeRemaining < 60 ? 'text-rose-500 font-bold' : 'text-slate-350'}>
                    Code Expires: {formatTime(otpTimeRemaining)}
                  </span>
                </div>

                {/* Resend button */}
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={resendTimer > 0 || isSendingOtp}
                  className="text-luxury-gold hover:underline font-semibold flex items-center space-x-1 cursor-pointer disabled:opacity-50 disabled:no-underline"
                >
                  {isSendingOtp && <RefreshCw className="h-3 w-3 animate-spin mr-1" />}
                  <span>{resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}</span>
                </button>
              </div>

              {/* Submit / Verification trigger button */}
              <button
                type="submit"
                disabled={isVerifyingOtp}
                className="w-full bg-gradient-to-r from-luxury-gold to-luxury-goldDark text-luxury-navy font-bold py-3 px-4 rounded-lg shadow-glow hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center space-x-2"
              >
                {isVerifyingOtp ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Verifying Secure OTP...</span>
                  </>
                ) : (
                  <span>Verify OTP & Access System</span>
                )}
              </button>

              {/* Navigation Back Link */}
              <button
                type="button"
                onClick={() => {
                  setStep('credentials');
                  setOtpError(null);
                  setOtpSuccess(null);
                }}
                className="w-full flex items-center justify-center space-x-2 text-xs text-slate-500 hover:text-slate-300 transition-colors py-2 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Return to Login Credentials</span>
              </button>
            </form>
          </div>
        )}

        {/* Demo Fast Login */}
        {step === 'credentials' && (
          <div className="mt-8 pt-6 border-t border-slate-800">
            <p className="text-xs font-semibold text-slate-400 text-center uppercase tracking-wider mb-3">
              Login Accounts detsils
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleDemoLogin('guest')}
                className="bg-slate-900 border border-slate-800 text-amber-400 hover:bg-slate-800 transition-colors py-2 px-3 rounded-lg text-xs font-semibold flex flex-col items-center justify-center cursor-pointer"
              >
                <span>Resident Guest Login</span>
                <span className="text-[10px] text-slate-500 font-normal">user login </span>
              </button>
              <button
                onClick={() => handleDemoLogin('manager')}
                className="bg-slate-900 border border-slate-800 text-sky-400 hover:bg-slate-800 transition-colors py-2 px-3 rounded-lg text-xs font-semibold flex flex-col items-center justify-center cursor-pointer"
              >
                <span>Manager Key</span>
                <span className="text-[10px] text-slate-500 font-normal">Department login</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm bg-luxury-darkCard border border-slate-800 rounded-xl p-6 relative animate-fade-in">
            <h3 className="text-lg font-bold font-serif text-white mb-2">Request Password Reset</h3>
            <p className="text-xs text-slate-450 mb-4 leading-relaxed">
              Enter the email address of your registered manager account, and we will simulate sending reset instructions.
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
                className="w-full bg-luxury-dark border border-slate-800 text-white rounded-lg px-4 py-2.5 text-sm focus:border-luxury-gold focus:outline-none"
              />
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(false);
                    setForgotStatus(null);
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-luxury-gold text-luxury-navy cursor-pointer disabled:opacity-50"
                >
                  {forgotLoading ? 'Processing...' : 'Send Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
