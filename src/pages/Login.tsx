import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import registrationImg from '../assets/registeration.png';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Dialog, DialogContent, DialogTitle, DialogActions } from '@mui/material';
import { Button } from '@/components/ui/button';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const { login, isAuthenticated, role, isLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    password: '',
    remember: false,
  });
  const [loading, setLoading] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [userId, setUserId] = useState('');
  const [timer, setTimer] = useState(120); // 2 minutes in seconds
  const [canResend, setCanResend] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Email verification states
  const [showEmailVerificationModal, setShowEmailVerificationModal] = useState(false);
  const [emailCode, setEmailCode] = useState('');
  const [emailCodeError, setEmailCodeError] = useState('');
  const [emailVerificationTimer, setEmailVerificationTimer] = useState(120);
  const [canResendEmailCode, setCanResendEmailCode] = useState(false);

  // Forgot Password States
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [showForgotOTPModal, setShowForgotOTPModal] = useState(false);
  const [forgotOTP, setForgotOTP] = useState('');
  const [showNewPasswordModal, setShowNewPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [forgotOTPTimer, setForgotOTPTimer] = useState(120);
  const [canResendForgotOTP, setCanResendForgotOTP] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated && role) {
      if (role === 'admin') {
        navigate('/admin/dashboard');
      } else if (role === 'teacher') {
        navigate('/teacher/dashboard');
      } else {
        navigate('/');
      }
    }
  }, [isAuthenticated, role, isLoading, navigate]);

  // Timer effects
  useEffect(() => {
    let interval;
    if (showCodeInput && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    if (showForgotOTPModal && forgotOTPTimer > 0) {
      interval = setInterval(() => {
        setForgotOTPTimer((prev) => prev - 1);
      }, 1000);
    } else if (forgotOTPTimer === 0) {
      setCanResendForgotOTP(true);
    }
    return () => clearInterval(interval);
  }, [showCodeInput, timer, showForgotOTPModal, forgotOTPTimer]);

  // Email verification timer
  useEffect(() => {
    let interval;
    if (showEmailVerificationModal && emailVerificationTimer > 0) {
      interval = setInterval(() => {
        setEmailVerificationTimer((prev) => prev - 1);
      }, 1000);
    } else if (emailVerificationTimer === 0) {
      setCanResendEmailCode(true);
    }
    return () => clearInterval(interval);
  }, [showEmailVerificationModal, emailVerificationTimer]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#7C3AED]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  // Don't render login form if already authenticated
  if (isAuthenticated) {
    return null;
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleResendOTP = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/users/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: form.email
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend OTP');
      }

      toast.success('OTP resent successfully!');
      setTimer(120); // Reset timer
      setCanResend(false);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleResendForgotOTP = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/users/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: forgotEmail
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend OTP');
      }

      toast.success('OTP resent successfully!');
      setForgotOTPTimer(120);
      setCanResendForgotOTP(false);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCodeVerify = async () => {
    if (!code.trim()) {
      setCodeError('Please enter the verification code');
      toast.error('Please enter the verification code');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/users/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          otp: code
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      toast.success('Verification successful! Logging you in...');
      setShowCodeInput(false);
      
      // After successful verification, try logging in again
      await handleLogin();
    } catch (error) {
      setCodeError(error.message);
      toast.error(error.message);
    }
  };

  // const handleLogin = async () => {
  //   try {
  //     const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/users/login?email=${encodeURIComponent(form.email)}&password=${encodeURIComponent(form.password)}`, {
  //       method: 'GET',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //     });

  //     const data = await response.json();

  //     if (!response.ok) {
  //       // Handle specific error cases
  //       if (data.error === 'Please verify your number to login' && data.userId) {
  //         setUserId(data.userId);
  //         setShowCodeInput(true);
  //         return;
  //       }
  //       // For 401 and other errors, throw the error message
  //       throw new Error(data.error || 'Login failed');
  //     }

  //     login({
  //       user: data.user,
  //       token: data.token,
  //       role: data.role,
  //     });

  //     toast.success('Login successful!');
      
  //     if (data.role === 'admin') {
  //       navigate('/admin/dashboard');
  //     } else if (data.role === 'teacher') {
  //       navigate('/teacher/dashboard');
  //     } else {
  //       navigate('/');
  //     }
  //   } catch (error) {
  //     // Show the specific error message from the server
  //     console.log('Login error:', error.message);
  //     toast.error(error.message || 'Login failed');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleLogin = async () => {
  try {
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/users/login`, {
      method: 'POST', // use POST now
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: form.email,
        password: form.password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle specific error cases
      if (data.error === 'Please verify your number to login' && data.userId) {
        setUserId(data.userId);
        setShowCodeInput(true);
        return;
      }
      // For 401 and other errors, throw the error message
      throw new Error(data.error || 'Login failed');
    }

    login({
      user: data.user,
      token: data.token,
      role: data.role,
    });

    toast.success('Login successful!');

    if (data.role === 'admin') {
      navigate('/admin/dashboard');
    } else if (data.role === 'teacher') {
      navigate('/teacher/dashboard');
    } else {
      navigate('/');
    }
  } catch (error) {
    console.log('Login error:', error.message);
    toast.error(error.message || 'Login failed');
  } finally {
    setLoading(false);
  }
};


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await handleLogin();
  };

  const handlePhoneChange = (value) => {
    setNewPhone(value);
  };

  const handleUpdatePhone = async () => {
    if (!newPhone || newPhone.length < 8) {
      toast.error('Please enter a valid phone number');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/users/update-user`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: form.email,
          contact_number: newPhone
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update phone number');
      }

      toast.success('Phone number updated successfully!');
      setShowPhoneModal(false);
      // Trigger new OTP send
      await handleResendOTP();
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Email verification handlers
  const handleSendEmailVerification = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/users/send-verification-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: form.email
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification email');
      }

      toast.success('Verification email sent successfully!');
      setShowPhoneModal(false);
      setShowEmailVerificationModal(true);
      setEmailVerificationTimer(120);
      setCanResendEmailCode(false);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleVerifyEmail = async () => {
    if (!emailCode.trim()) {
      setEmailCodeError('Please enter the verification code');
      toast.error('Please enter the verification code');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/users/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: form.email,
          emailCode: emailCode
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Email verification failed');
      }

      toast.success('Email verified successfully! Logging you in...');
      setShowEmailVerificationModal(false);
      
      // After successful verification, try logging in again
      await handleLogin();
    } catch (error) {
      setEmailCodeError(error.message);
      toast.error(error.message);
    }
  };

  const handleResendEmailCode = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/users/send-verification-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: form.email
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend verification email');
      }

      toast.success('Verification email resent successfully!');
      setEmailVerificationTimer(120);
      setCanResendEmailCode(false);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(forgotEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/users/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: forgotEmail
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      toast.success('OTP sent to your email!');
      setShowForgotModal(false);
      setShowForgotOTPModal(true);
      setForgotOTPTimer(120);
      setCanResendForgotOTP(false);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleVerifyForgotOTP = async () => {
    if (!forgotOTP.trim()) {
      toast.error('Please enter the verification code');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/users/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: forgotEmail,
          otp: forgotOTP
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid OTP');
      }

      toast.success('OTP verified successfully!');
      setShowForgotOTPModal(false);
      setShowNewPasswordModal(true);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmNewPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/users/update-user-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: forgotEmail,
          password: newPassword
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update password');
      }

      toast.success('Password updated successfully!');
      setShowNewPasswordModal(false);

      // Auto login with new password
      setForm(prev => ({
        ...prev,
        email: forgotEmail,
        password: newPassword
      }));
      await handleLogin();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#7C3AED] px-2 relative overflow-hidden pb-10 w-screen">
    <div className="flex flex-col items-center mb-2 animate-fadein pt-5 pb-10">
        <a href="/">
            <img src="https://examwalk.site/assets/logo-CbMpVJM2.png" alt="ExamWalk Logo" className="h-16 drop-shadow-lg mb-2" style={{ filter: 'drop-shadow(0 4px 16px rgba(124,60,237,0.5))' }} />
        </a>
    </div>

    <div className="flex items-center justify-center">
      {/* Animated background blobs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse z-0" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse z-0" />
      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-center gap-0 md:gap-8 animate-slideup-fadein">
        {/* Left: Login Card */}
        <div className="flex-1 flex flex-col items-center">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 z-10">
            <div className="flex flex-col items-center mb-6">
              <h2 className="text-3xl font-extrabold text-[#7C3AED] mb-1 tracking-tight">Welcome Back <span role='img' aria-label='wave'>👋</span></h2>
              <p className="text-gray-600 text-base text-center">Please login to continue</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.email}</label>
                <input type="email" name="email" value={form.email} onChange={handleChange} required className="mt-1 w-full rounded-lg border border-gray-300 bg-white/70 px-3 py-2 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED] transition-all duration-200" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.password}</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    name="password" 
                    value={form.password} 
                    onChange={handleChange} 
                    required 
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white/70 px-3 py-2 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED] transition-all duration-200" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center">
                  <input type="checkbox" name="remember" checked={form.remember} onChange={handleChange} className="mr-2" />
                  {t.rememberMe}
                </label>
                <button 
                  type="button"
                  onClick={() => setShowForgotModal(true)} 
                  className="text-[#7C3AED] hover:underline focus:outline-none"
                >
                  {t.forgotPassword}
                </button>
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-[#7C3AED] text-white font-semibold py-2 rounded-lg shadow-lg hover:bg-[#6d28d9] hover:scale-105 transition-all duration-200 flex items-center justify-center"
              >
                {loading ? 'Logging in...' : t.login}
              </button>
            </form>
            <div className="text-center mt-4 text-sm text-gray-600">
              {t.dontHaveAccount} <a href="/signup" className="text-[#7C3AED] font-semibold hover:underline">{t.signup}</a>
              <div className="mt-2 space-x-4">
                <a 
                  href="/privacy-policy-standalone" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[#7C3AED] hover:underline text-xs"
                >
                  {t.privacyPolicy}
                </a>
                <span className="text-gray-400">|</span>
                <a 
                  href="/terms-conditions-standalone" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[#7C3AED] hover:underline text-xs"
                >
                  {t.termsConditions}
                </a>
              </div>
            </div>
          </div>
        </div>
        {/* Right: Image */}
        <div className="hidden md:flex flex-1 items-center justify-center h-full">
          <img src={registrationImg} alt="Registration" className="hidden md:block md:w-[400px] w-auto object-contain rounded-2xl animate-fadein" />
        </div>
      </div>
      {/* Animations */}
      <style>{`
        .animate-fadein { animation: fadein 0.8s; }
        .animate-slideup-fadein { animation: slideupfadein 0.9s cubic-bezier(.39,.575,.565,1) both; }
        @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideupfadein { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>

    {/* OTP Dialog */}
    <Dialog open={showCodeInput} onClose={() => setShowCodeInput(false)}>
      <DialogTitle>Verify Your Phone</DialogTitle>
      <DialogContent>
        <div className="mb-2">Enter the verification code sent to your mobile number.</div>
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-gray-600">Having trouble with this number?</span>
          <Button 
            onClick={() => setShowPhoneModal(true)} 
            variant="outline"
            size="sm"
          >
            Change Number
          </Button>
        </div>
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white/70 px-3 py-2 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED] mb-2 transition-all duration-200"
          placeholder="Enter verification code"
          autoFocus
        />
        {codeError && <div className="text-red-500 text-sm mb-2 animate-shake">{codeError}</div>}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600">
            Time remaining: {formatTime(timer)}
          </div>
          <Button 
            onClick={handleResendOTP}
            disabled={!canResend}
            variant="outline"
            className={`text-[#7C3AED] ${!canResend ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#7C3AED]/10'}`}
          >
            Resend OTP
          </Button>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowCodeInput(false)} variant="outline">Cancel</Button>
        <Button 
          onClick={handleSendEmailVerification}
          variant="outline"
          className="text-[#7C3AED] border-[#7C3AED] hover:bg-[#7C3AED]/10"
        >
          Email Verification
        </Button>
        <Button 
          onClick={handleCodeVerify} 
          className="bg-[#7C3AED] text-white hover:bg-[#6d28d9]"
        >
          Verify
        </Button>
      </DialogActions>
    </Dialog>

    {/* Phone Update Modal */}
    <Dialog open={showPhoneModal} onClose={() => setShowPhoneModal(false)}>
      <DialogTitle>Update Phone Number</DialogTitle>
      <DialogContent>
        <div className="mb-4">Enter your new phone number</div>
        <PhoneInput
          country={'us'}
          value={newPhone}
          onChange={handlePhoneChange}
          inputClass="!w-full !rounded-lg !border !border-gray-300 !bg-white/70 !focus:outline-none !focus:border-[#7C3AED] !focus:ring-2 !focus:ring-[#7C3AED] !transition-all !duration-200"
          inputStyle={{ width: '100%' }}
          specialLabel=""
        />
        <div className="mt-4 flex gap-2">
          <Button 
            onClick={handleUpdatePhone}
            className="bg-[#7C3AED] text-white hover:bg-[#6d28d9] flex-1"
          >
            Update & Send OTP
          </Button>
          <Button 
            onClick={handleSendEmailVerification}
            variant="outline"
            className="text-[#7C3AED] border-[#7C3AED] hover:bg-[#7C3AED]/10 flex-1"
          >
            Email Verification
          </Button>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowPhoneModal(false)} variant="outline">Cancel</Button>
      </DialogActions>
    </Dialog>

    {/* Email Verification Modal */}
    <Dialog open={showEmailVerificationModal} onClose={() => setShowEmailVerificationModal(false)}>
      <DialogTitle>Verify Your Email</DialogTitle>
      <DialogContent>
        <div className="mb-2">Enter the verification code sent to your email address.</div>
        <input
          type="text"
          value={emailCode}
          onChange={e => setEmailCode(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white/70 px-3 py-2 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED] mb-2 transition-all duration-200"
          placeholder="Enter verification code"
          autoFocus
        />
        {emailCodeError && <div className="text-red-500 text-sm mb-2 animate-shake">{emailCodeError}</div>}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600">
            Time remaining: {formatTime(emailVerificationTimer)}
          </div>
          <Button 
            onClick={handleResendEmailCode}
            disabled={!canResendEmailCode}
            variant="outline"
            className={`text-[#7C3AED] ${!canResendEmailCode ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#7C3AED]/10'}`}
          >
            Resend Code
          </Button>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowEmailVerificationModal(false)} variant="outline">Cancel</Button>
        <Button 
          onClick={handleVerifyEmail} 
          className="bg-[#7C3AED] text-white hover:bg-[#6d28d9]"
        >
          Verify Email
        </Button>
      </DialogActions>
    </Dialog>

    {/* Forgot Password Modal */}
    <Dialog open={showForgotModal} onClose={() => setShowForgotModal(false)}>
      <DialogTitle>Forgot Password</DialogTitle>
      <DialogContent>
        <div className="mb-4">Enter your email address to receive a verification code.</div>
        <input
          type="email"
          value={forgotEmail}
          onChange={(e) => setForgotEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white/70 px-3 py-2 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED] mb-2 transition-all duration-200"
          placeholder="Enter your email"
          autoFocus
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowForgotModal(false)} variant="outline">Cancel</Button>
        <Button 
          onClick={handleForgotPassword}
          className="bg-[#7C3AED] text-white hover:bg-[#6d28d9]"
        >
          Send Code
        </Button>
      </DialogActions>
    </Dialog>

    {/* Forgot Password OTP Verification Modal */}
    <Dialog open={showForgotOTPModal} onClose={() => setShowForgotOTPModal(false)}>
      <DialogTitle>Verify Your Email</DialogTitle>
      <DialogContent>
        <div className="mb-2">Enter the verification code sent to your email.</div>
        <input
          type="text"
          value={forgotOTP}
          onChange={(e) => setForgotOTP(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white/70 px-3 py-2 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED] mb-2 transition-all duration-200"
          placeholder="Enter verification code"
          autoFocus
        />
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600">
            Time remaining: {Math.floor(forgotOTPTimer / 60)}:{(forgotOTPTimer % 60).toString().padStart(2, '0')}
          </div>
          <Button 
            onClick={handleResendForgotOTP}
            disabled={!canResendForgotOTP}
            variant="outline"
            className={`text-[#7C3AED] ${!canResendForgotOTP ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#7C3AED]/10'}`}
          >
            Resend OTP
          </Button>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowForgotOTPModal(false)} variant="outline">Cancel</Button>
        <Button 
          onClick={handleVerifyForgotOTP}
          className="bg-[#7C3AED] text-white hover:bg-[#6d28d9]"
        >
          Verify
        </Button>
      </DialogActions>
    </Dialog>

    {/* New Password Modal */}
    <Dialog open={showNewPasswordModal} onClose={() => setShowNewPasswordModal(false)}>
      <DialogTitle>Set New Password</DialogTitle>
      <DialogContent>
        <div className="mb-4">Enter your new password</div>
        <div className="space-y-4">
          <div className="relative">
            <input
              type={showNewPass ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white/70 px-3 py-2 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED] mb-2 transition-all duration-200"
              placeholder="New password"
            />
            <button
              type="button"
              onClick={() => setShowNewPass(!showNewPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              {showNewPass ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
          <div className="relative">
            <input
              type={showConfirmPass ? "text" : "password"}
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white/70 px-3 py-2 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED] mb-2 transition-all duration-200"
              placeholder="Confirm new password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPass(!showConfirmPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              {showConfirmPass ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowNewPasswordModal(false)} variant="outline">Cancel</Button>
        <Button 
          onClick={handleUpdatePassword}
          className="bg-[#7C3AED] text-white hover:bg-[#6d28d9]"
        >
          Update Password
        </Button>
      </DialogActions>
    </Dialog>
    </div>
  );
};

export default Login;
