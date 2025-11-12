import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import purpleLogo from '@/assets/ExamWalk Purple Logo.svg';
import studyIllustration from '@/assets/students-exam.png';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Dialog, DialogContent, DialogTitle, DialogActions } from '@mui/material';
import { Button } from '@/components/ui/button';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react';

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
      } else if (role === 'student') {
        navigate('/student/dashboard');
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
    } else if (data.role === 'student') {
      navigate('/student/dashboard');
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
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-30rem] left-[-10rem] h-[45rem] w-[45rem] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-[-25rem] right-[-15rem] h-[40rem] w-[40rem] rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto px-2 py-12 lg:py-8">
        <header className="flex items-center gap-3 mb-8" aria-label="ExamWalk">
          <a href="/" className="flex items-center gap-3">
            <img
              src={purpleLogo}
              alt="ExamWalk Logo"
              className="h-10 w-auto drop-shadow-sm"
            />
            <div className="flex flex-col">
              <span className="text-xl font-semibold text-primary">ExamWalk</span>
              <span className="text-xs text-muted-foreground tracking-wider uppercase">
                Master Exams with Confidence
              </span>
            </div>
          </a>
        </header>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="order-2 lg:order-1 bg-card/80 backdrop-blur-sm border border-border/60 rounded-3xl shadow-lg shadow-primary/5 p-8 sm:p-10 md:p-12">
            <div className="mb-8">
              <p className="text-sm font-medium text-primary uppercase tracking-[0.2em] mb-2">
                {t.welcomeBack || 'Welcome back'}
              </p>
              <h1 className="text-3xl sm:text-4xl font-semibold text-foreground mb-2">
                {t.loginHeadline || 'Sign in to your account'}
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                {t.loginSubheadline || 'Access personalized practice, live analytics, and exam-ready insights.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground" htmlFor="email">
                  {t.emailLabel || 'Email address'}
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-border bg-background/90 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground" htmlFor="password">
                  {t.passwordLabel || 'Password'}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-border bg-background/90 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    name="remember"
                    checked={form.remember}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  {t.rememberMe || 'Remember me'}
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-sm font-medium text-primary hover:text-primary/80"
                >
                  {t.forgotPassword || 'Forgot password?'}
                </button>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 text-base font-semibold shadow-md shadow-primary/10 hover:shadow-primary/20"
              >
                {loading ? 'Logging in...' : t.login || 'Sign in'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

            </form>

            <div className="mt-8 text-sm text-muted-foreground text-center">
              {t.dontHaveAccount || "Don't have an account?"}{' '}
              <a href="/signup" className="font-semibold text-primary hover:text-primary/80">
                {t.signup || 'Sign up'}
              </a>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-muted-foreground">
              <a
                href="/privacy-policy-standalone"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary"
              >
                {t.privacyPolicy || 'Privacy Policy'}
              </a>
              <a
                href="/terms-conditions-standalone"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary"
              >
                {t.termsConditions || 'Terms & Conditions'}
              </a>
            </div>
          </div>

          <div className="order-1 lg:order-2 relative">
            <div className="absolute -inset-2 rounded-[2.5rem] bg-gradient-to-br from-primary/30 via-secondary/20 to-accent/20 blur-2xl opacity-75" />
            <div className="relative rounded-[2.5rem] border border-border/50 bg-gradient-to-br from-background via-background/95 to-primary/5 shadow-xl overflow-hidden">
              <div className="absolute inset-0 bg-grid-small border-border/80 opacity-[0.07]" />
              <div className="relative p-10 md:p-14 flex flex-col h-full justify-between">
                <div className="space-y-4 max-w-sm">
                  <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                    {t.loginPanelTag || 'Trusted by achievers'}
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </span>
                  <h2 className="text-3xl font-semibold text-foreground leading-tight">
                    {t.loginPanelHeadline || 'Accelerate your exam readiness with focused practice.'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t.loginPanelBody ||
                      'Curated question banks, AI-powered feedback, and real-time analytics keep you ahead of every assessment.'}
                  </p>
                </div>

                <div className="mt-10">
                  <img
                    src={studyIllustration}
                    alt={t.loginIllustrationAlt || 'Student preparing for exams'}
                    className="w-full max-w-lg mx-auto drop-shadow-md"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
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