import React, { useState, useEffect } from 'react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import registrationImg from '../assets/registeration.png';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Signup = () => {
    const navigate = useNavigate();
    const { isAuthenticated, role, isLoading } = useAuth();
    // Separate form states for Teacher and Student to preserve inputs per tab
    const [teacherForm, setTeacherForm] = useState({
        fullName: '',
        displayName: '',
        email: '',
        phoneNumber: '',
        password: '',
        confirmPassword: '',
        profileImage: null as File | null,
    });
    const [studentForm, setStudentForm] = useState({
        fullName: '',
        displayName: '',
        email: '',
        phoneNumber: '',
        password: '',
        confirmPassword: '',
        profileImage: null as File | null,
    });
    const [showCodeInput, setShowCodeInput] = useState(false);
    const [code, setCode] = useState('');
    const [codeError, setCodeError] = useState('');
    const [success, setSuccess] = useState(false);
    const [formError, setFormError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userId, setUserId] = useState(null);
    const [timer, setTimer] = useState(120); // 2 minutes in seconds
    const [canResend, setCanResend] = useState(false);
    const [showPhoneModal, setShowPhoneModal] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    // Tab state: teacher | student
    const [activeTab, setActiveTab] = useState('teacher');

    // Email verification states
    const [showEmailVerificationModal, setShowEmailVerificationModal] = useState(false);
    const [emailCode, setEmailCode] = useState('');
    const [emailCodeError, setEmailCodeError] = useState('');
    const [emailVerificationTimer, setEmailVerificationTimer] = useState(120);
    const [canResendEmailCode, setCanResendEmailCode] = useState(false);
    
    // Remember the email used during registration to avoid cross-tab confusion during verification
    const [registeredEmail, setRegisteredEmail] = useState<string>('');

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
        return () => clearInterval(interval);
    }, [showCodeInput, timer]);

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

    // Don't render signup form if already authenticated
    if (isAuthenticated) {
        return null;
    }

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        if (activeTab === 'teacher') {
            setTeacherForm((prev) => ({
                ...prev,
                [name]: files ? files[0] : value,
            }));
        } else {
            setStudentForm((prev) => ({
                ...prev,
                [name]: files ? files[0] : value,
            }));
        }
    };

    const handlePhoneChange = (value) => {
        if (activeTab === 'teacher') {
            setTeacherForm(prev => ({ ...prev, phoneNumber: value }));
        } else {
            setStudentForm(prev => ({ ...prev, phoneNumber: value }));
        }
    };

    const validateForm = (formToValidate) => {
        if (!formToValidate.fullName || !formToValidate.displayName || !formToValidate.email || !formToValidate.phoneNumber || !formToValidate.password || !formToValidate.confirmPassword) {
            return 'Please fill in all required fields.';
        }
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(formToValidate.email)) {
            return 'Please enter a valid email address.';
        }
        if (formToValidate.password !== formToValidate.confirmPassword) {
            return 'Passwords do not match.';
        }
        if (formToValidate.phoneNumber.length < 8) {
            return 'Please enter a valid phone number.';
        }
        return '';
    };

    const uploadToBackend = async (file) => {
        const data = new FormData();
        data.append("file", file);

        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/storage/upload`, {
                method: "POST",
                body: data,
            });

            const result = await response.json();
            if (result.success && result.data.public_url) {
                return result.data.public_url;
            } else {
                throw new Error("Upload failed: Invalid response");
            }
        } catch (error) {
            console.error("Upload failed:", error);
            throw new Error("Failed to upload image");
        }
    };

    

    const handleSubmit = async (e) => {
        e.preventDefault();
        const currentForm = activeTab === 'teacher' ? teacherForm : studentForm;
        const error = validateForm(currentForm);
        if (error) {
            setFormError(error);
            toast.error(error);
            return;
        }
        setFormError('');
        setIsSubmitting(true);

        try {
            let profileImageUrl = null;
            if (currentForm.profileImage) {
                profileImageUrl = await uploadToBackend(currentForm.profileImage);
            }

            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    full_name: currentForm.fullName,
                    display_name: currentForm.displayName,
                    email: currentForm.email,
                    contact_number: currentForm.phoneNumber,
                    password: currentForm.password,
                    profile_image: profileImageUrl,
                    role: activeTab === 'teacher' ? 'teacher' : 'student',
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            setUserId(data.id);
            setRegisteredEmail(currentForm.email);
            // navigate('/login');
            setShowCodeInput(true);
            toast.success('Registration successful! Please check your phone for the verification code.');
        } catch (error) {
            setFormError(error.message);
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
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

            toast.success('Verification successful! Redirecting to dashboard...');
            setShowCodeInput(false);
            navigate('/login');
        } catch (error) {
            setCodeError(error.message);
            toast.error(error.message);
        }
    };

    const handleResendOTP = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/users/send-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: registeredEmail || (activeTab === 'teacher' ? teacherForm.email : studentForm.email)
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

    const handleUpdatePhone = async () => {
        const currentForm = activeTab === 'teacher' ? teacherForm : studentForm;
        const emailToUse = registeredEmail || currentForm.email;
        if (!currentForm.phoneNumber || !emailToUse) {
            toast.error('Please enter a valid phone number and email');
            return;
        }

        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/users/update-user`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: emailToUse,
                    contact_number: currentForm.phoneNumber
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
                    email: registeredEmail || (activeTab === 'teacher' ? teacherForm.email : studentForm.email)
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
                    email: registeredEmail || (activeTab === 'teacher' ? teacherForm.email : studentForm.email),
                    emailCode: emailCode
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Email verification failed');
            }

            toast.success('Email verified successfully! Redirecting to login...');
            setShowEmailVerificationModal(false);
            navigate('/login');
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
                    email: registeredEmail || (activeTab === 'teacher' ? teacherForm.email : studentForm.email)
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
                    {/* Left: Image */}
                    <div className="hidden md:flex flex-1 items-center justify-center h-full">
                        <img src={registrationImg} alt="Registration" className="hidden md:block md:w-[500px] lg:w-[700px] w-auto object-contain rounded-2xl animate-fadein" />
                    </div>
                    {/* Right: Signup Card */}
                    <div className="flex-1 flex flex-col items-center">
                        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 z-10">
                            {/* Tabs */}
                            <div className="mb-6 flex items-center justify-center">
                                <div className="relative w-full max-w-sm bg-gradient-to-r from-[#7C3AED]/30 via-[#8B5CF6]/20 to-[#7C3AED]/30 backdrop-blur-md rounded-2xl p-1 shadow-inner border border-white/30 drop-shadow">
                                    {/* Glass slider */}
                                    <div
                                        className="absolute top-1 bottom-1 left-1 rounded-xl bg-white/60 backdrop-blur-md border border-white/50 shadow transition-transform duration-300 ease-out"
                                        style={{ width: 'calc(50% - 0.25rem)', transform: activeTab === 'teacher' ? 'translateX(0)' : 'translateX(calc(100% + 0.25rem))' }}
                                    />
                                    <div className="relative grid grid-cols-2 gap-0">
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('teacher')}
                                            className={`w-full px-6 py-2.5 rounded-xl text-sm md:text-base font-semibold transition-colors duration-200 ${activeTab === 'teacher' ? 'text-[#7C3AED]' : 'text-gray-700 hover:text-gray-900'}`}
                                        >
                                            Teacher
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('student')}
                                            className={`w-full px-6 py-2.5 rounded-xl text-sm md:text-base font-semibold transition-colors duration-200 ${activeTab === 'student' ? 'text-[#7C3AED]' : 'text-gray-700 hover:text-gray-900'}`}
                                        >
                                            Student
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Header */}
                            <div className="flex flex-col items-center mb-6 animate-fadein">
                                <h2 className="text-3xl font-extrabold text-[#7C3AED] mb-1 tracking-tight">
                                    {activeTab === 'teacher' ? 'Teacher Registration' : 'Student Registration'}
                                </h2>
                                <p className="text-gray-600 text-base text-center">
                                    {activeTab === 'teacher'
                                        ? 'Create a teacher account to publish courses and manage exams.'
                                        : 'Create a student account to enroll in courses and take exams.'}
                                </p>
                            </div>

                            {/* Teacher Form (UNCHANGED behavior) */}
                            {activeTab === 'teacher' && (
                                <>
                                    {success ? (
                                        <div className="text-center text-green-600 font-semibold text-lg py-8 animate-fadein">Registration Successful!</div>
                                    ) : (
                                        <form onSubmit={handleSubmit} className="space-y-5">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                                <input type="text" name="fullName" value={teacherForm.fullName} onChange={handleChange} required className="mt-1 w-full rounded-lg border border-gray-300 bg-white/70 px-3 py-2 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED] transition-all duration-200" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                                                <input type="text" name="displayName" value={teacherForm.displayName} onChange={handleChange} required className="mt-1 w-full rounded-lg border border-gray-300 bg-white/70 px-3 py-2 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED] transition-all duration-200" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                                <input type="email" name="email" value={teacherForm.email} onChange={handleChange} required className="mt-1 w-full rounded-lg border border-gray-300 bg-white/70 px-3 py-2 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED] transition-all duration-200" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                                                <PhoneInput
                                                    country={'gb'}
                                                    value={teacherForm.phoneNumber}
                                                    onChange={handlePhoneChange}
                                                    inputClass="w-full rounded-lg border border-gray-300 bg-white/70 px-3 py-2 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED] transition-all duration-200"
                                                    buttonClass="!border !border-gray-300 !bg-white/70 !rounded-l-lg !w-[40px]"
                                                    containerClass="mt-1"
                                                    searchClass="!w-full !rounded-lg !border !border-gray-300 !bg-white/70 !px-3 !py-2 !focus:outline-none !focus:border-[#7C3AED] !focus:ring-2 !focus:ring-[#7C3AED] !transition-all !duration-200"
                                                    searchPlaceholder="Search country..."
                                                    enableSearch={true}
                                                    searchNotFound="Country not found"
                                                    inputProps={{
                                                        required: true,
                                                        name: 'phoneNumber',
                                                    }}
                                                    dropdownClass="!w-[300px] !max-h-[200px] !overflow-y-auto"
                                                    buttonStyle={{
                                                        border: '1px solid #D1D5DB',
                                                        backgroundColor: 'rgba(255, 255, 255, 0.7)',
                                                        borderRadius: '0.5rem 0 0 0.5rem',
                                                        width: '40px',
                                                        minWidth: '40px',
                                                        maxWidth: '40px',
                                                        padding: 0
                                                    }}
                                                    inputStyle={{
                                                        width: '100%',
                                                        height: '42px',
                                                        border: '1px solid #D1D5DB',
                                                        backgroundColor: 'rgba(255, 255, 255, 0.7)',
                                                        borderRadius: '0 0.5rem 0.5rem 0',
                                                        paddingLeft: '45px'
                                                    }}
                                                    searchStyle={{
                                                        width: '100%',
                                                        border: '1px solid #D1D5DB',
                                                        backgroundColor: 'rgba(255, 255, 255, 0.7)',
                                                        borderRadius: '0.5rem',
                                                        padding: '0.5rem'
                                                    }}
                                                    countryCodeEditable={false}
                                                    disableSearchIcon={true}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                                <div className="relative">
                                                    <input 
                                                        type={showPassword ? "text" : "password"} 
                                                        name="password" 
                                                        value={teacherForm.password} 
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
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                                                <div className="relative">
                                                    <input 
                                                        type={showConfirmPassword ? "text" : "password"} 
                                                        name="confirmPassword" 
                                                        value={teacherForm.confirmPassword} 
                                                        onChange={handleChange} 
                                                        required 
                                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white/70 px-3 py-2 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED] transition-all duration-200" 
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                                                    >
                                                        {showConfirmPassword ? (
                                                            <EyeOff className="h-5 w-5" />
                                                        ) : (
                                                            <Eye className="h-5 w-5" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Profile Image (optional)</label>
                                                <input type="file" name="profileImage" accept="image/*" onChange={handleChange} className="mt-1 w-full rounded-lg border border-gray-300 bg-white/70 px-3 py-2" />
                                            </div>
                                            {formError && (
                                                <div className="w-full text-center text-red-600 font-semibold text-base mb-2 animate-fadein">{formError}</div>
                                            )}

                                            <button 
                                                type="submit" 
                                                disabled={isSubmitting}
                                                className={`w-full bg-[#7C3AED] text-white font-semibold py-2 rounded-lg shadow-lg hover:bg-[#6d28d9] hover:scale-105 transition-all duration-200 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                                            >
                                                {isSubmitting ? 'Signing up...' : 'Sign Up'}
                                            </button>
                                        </form>
                                    )}
                                </>
                            )}

                            {/* Student Form (new) */}
                            {activeTab === 'student' && (
                                <>
                                    {success ? (
                                        <div className="text-center text-green-600 font-semibold text-lg py-8 animate-fadein">Registration Successful!</div>
                                    ) : (
                                        <form onSubmit={handleSubmit} className="space-y-5">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                                <input type="text" name="fullName" value={studentForm.fullName} onChange={handleChange} required className="mt-1 w-full rounded-lg border border-gray-300 bg-white/70 px-3 py-2 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED] transition-all duration-200" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                                                <input type="text" name="displayName" value={studentForm.displayName} onChange={handleChange} required className="mt-1 w-full rounded-lg border border-gray-300 bg-white/70 px-3 py-2 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED] transition-all duration-200" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                                <input type="email" name="email" value={studentForm.email} onChange={handleChange} required className="mt-1 w-full rounded-lg border border-gray-300 bg-white/70 px-3 py-2 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED] transition-all duration-200" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                                                <PhoneInput
                                                    country={'gb'}
                                                    value={studentForm.phoneNumber}
                                                    onChange={handlePhoneChange}
                                                    inputClass="w-full rounded-lg border border-gray-300 bg-white/70 px-3 py-2 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED] transition-all duration-200"
                                                    buttonClass="!border !border-gray-300 !bg-white/70 !rounded-l-lg !w-[40px]"
                                                    containerClass="mt-1"
                                                    searchClass="!w-full !rounded-lg !border !border-gray-300 !bg-white/70 !px-3 !py-2 !focus:outline-none !focus:border-[#7C3AED] !focus:ring-2 !focus:ring-[#7C3AED] !transition-all !duration-200"
                                                    searchPlaceholder="Search country..."
                                                    enableSearch={true}
                                                    searchNotFound="Country not found"
                                                    inputProps={{
                                                        required: true,
                                                        name: 'phoneNumber',
                                                    }}
                                                    dropdownClass="!w-[300px] !max-h-[200px] !overflow-y-auto"
                                                    buttonStyle={{
                                                        border: '1px solid #D1D5DB',
                                                        backgroundColor: 'rgba(255, 255, 255, 0.7)',
                                                        borderRadius: '0.5rem 0 0 0.5rem',
                                                        width: '40px',
                                                        minWidth: '40px',
                                                        maxWidth: '40px',
                                                        padding: 0
                                                    }}
                                                    inputStyle={{
                                                        width: '100%',
                                                        height: '42px',
                                                        border: '1px solid #D1D5DB',
                                                        backgroundColor: 'rgba(255, 255, 255, 0.7)',
                                                        borderRadius: '0 0.5rem 0.5rem 0',
                                                        paddingLeft: '45px'
                                                    }}
                                                    searchStyle={{
                                                        width: '100%',
                                                        border: '1px solid #D1D5DB',
                                                        backgroundColor: 'rgba(255, 255, 255, 0.7)',
                                                        borderRadius: '0.5rem',
                                                        padding: '0.5rem'
                                                    }}
                                                    countryCodeEditable={false}
                                                    disableSearchIcon={true}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                                <div className="relative">
                                                    <input 
                                                        type={showPassword ? "text" : "password"} 
                                                        name="password" 
                                                        value={studentForm.password} 
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
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                                                <div className="relative">
                                                    <input 
                                                        type={showConfirmPassword ? "text" : "password"} 
                                                        name="confirmPassword" 
                                                        value={studentForm.confirmPassword} 
                                                        onChange={handleChange} 
                                                        required 
                                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white/70 px-3 py-2 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED] transition-all duration-200" 
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                                                    >
                                                        {showConfirmPassword ? (
                                                            <EyeOff className="h-5 w-5" />
                                                        ) : (
                                                            <Eye className="h-5 w-5" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Profile Image (optional)</label>
                                                <input type="file" name="profileImage" accept="image/*" onChange={handleChange} className="mt-1 w-full rounded-lg border border-gray-300 bg-white/70 px-3 py-2" />
                                            </div>
                                            {formError && (
                                                <div className="w-full text-center text-red-600 font-semibold text-base mb-2 animate-fadein">{formError}</div>
                                            )}

                                            <button 
                                                type="submit" 
                                                disabled={isSubmitting}
                                                className={`w-full bg-[#7C3AED] text-white font-semibold py-2 rounded-lg shadow-lg hover:bg-[#6d28d9] hover:scale-105 transition-all duration-200 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                                            >
                                                {isSubmitting ? 'Signing up...' : 'Sign Up'}
                                            </button>
                                        </form>
                                    )}
                                </>
                            )}

                            <div className="text-center mt-4 text-sm text-gray-600">
                                Already have an account? <a href="/login" className="text-[#7C3AED] font-semibold hover:underline">Login</a>
                                <div className="mt-2 space-x-4">
                                    <a 
                                        href="/privacy-policy-standalone" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-[#7C3AED] hover:underline text-xs"
                                    >
                                        Privacy Policy
                                    </a>
                                    <span className="text-gray-400">|</span>
                                    <a 
                                        href="/terms-conditions-standalone" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-[#7C3AED] hover:underline text-xs"
                                    >
                                        Terms & Conditions
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <Dialog open={showCodeInput} onClose={() => setShowCodeInput(false)}>
                    <DialogTitle>Verify Your Phone</DialogTitle>
                    <DialogContent>
                        <div className="mb-2">Enter the verification code sent to your mobile number.</div>
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-sm text-gray-600">Having trouble with this number?</span>
                            <Button 
                                onClick={() => setShowPhoneModal(true)}
                                style={{ 
                                    color: '#7C3AED',
                                    border: '1px solid #7C3AED',
                                    padding: '4px 12px',
                                    fontSize: '0.875rem'
                                }}
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
                                style={{ 
                                    color: '#7C3AED',
                                    opacity: !canResend ? 0.5 : 1,
                                    cursor: !canResend ? 'not-allowed' : 'pointer'
                                }}
                            >
                                Resend OTP
                            </Button>
                        </div>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setShowCodeInput(false)} color="secondary">Cancel</Button>
                        <Button 
                            onClick={handleSendEmailVerification}
                            style={{ 
                                color: '#7C3AED',
                                border: '1px solid #7C3AED'
                            }}
                        >
                            Email Verification
                        </Button>
                        <Button 
                            onClick={handleCodeVerify} 
                            variant="contained" 
                            style={{ background: '#7C3AED' }}
                        >
                            Verify
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Update Phone Modal */}
                <Dialog open={showPhoneModal} onClose={() => setShowPhoneModal(false)}>
                    <DialogTitle>Update Phone Number</DialogTitle>
                    <DialogContent>
                        <div className="mb-4">Enter your new phone number</div>
                        <PhoneInput
                            country={'gb'}
                            value={activeTab === 'teacher' ? teacherForm.phoneNumber : studentForm.phoneNumber}
                            onChange={handlePhoneChange}
                            inputClass="w-full rounded-lg border border-gray-300 bg-white/70 px-3 py-2 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED] transition-all duration-200"
                            buttonClass="!border !border-gray-300 !bg-white/70 !rounded-l-lg !w-[40px]"
                            containerClass="mt-1"
                            searchClass="!w-full !rounded-lg !border !border-gray-300 !bg-white/70 !px-3 !py-2 !focus:outline-none !focus:border-[#7C3AED] !focus:ring-2 !focus:ring-[#7C3AED] !transition-all !duration-200"
                            searchPlaceholder="Search country..."
                            enableSearch={true}
                            searchNotFound="Country not found"
                            inputProps={{
                                required: true,
                                name: 'phoneNumber',
                            }}
                            dropdownClass="!w-[300px] !max-h-[200px] !overflow-y-auto"
                            buttonStyle={{
                                border: '1px solid #D1D5DB',
                                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                                borderRadius: '0.5rem 0 0 0.5rem',
                                width: '40px',
                                minWidth: '40px',
                                maxWidth: '40px',
                                padding: 0
                            }}
                            inputStyle={{
                                width: '100%',
                                height: '42px',
                                border: '1px solid #D1D5DB',
                                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                                borderRadius: '0 0.5rem 0.5rem 0',
                                paddingLeft: '45px'
                            }}
                            searchStyle={{
                                width: '100%',
                                border: '1px solid #D1D5DB',
                                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                                borderRadius: '0.5rem',
                                padding: '0.5rem'
                            }}
                            countryCodeEditable={false}
                            disableSearchIcon={true}
                        />
                        <div className="mt-4 flex gap-2">
                            <Button 
                                onClick={handleUpdatePhone}
                                variant="contained" 
                                style={{ background: '#7C3AED', flex: 1 }}
                            >
                                Update & Send OTP
                            </Button>
                            <Button 
                                onClick={handleSendEmailVerification}
                                variant="outlined" 
                                style={{ 
                                    color: '#7C3AED',
                                    borderColor: '#7C3AED',
                                    flex: 1
                                }}
                            >
                                Email Verification
                            </Button>
                        </div>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setShowPhoneModal(false)} color="secondary">Cancel</Button>
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
                                style={{ 
                                    color: '#7C3AED',
                                    opacity: !canResendEmailCode ? 0.5 : 1,
                                    cursor: !canResendEmailCode ? 'not-allowed' : 'pointer'
                                }}
                            >
                                Resend Code
                            </Button>
                        </div>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setShowEmailVerificationModal(false)} color="secondary">Cancel</Button>
                        <Button 
                            onClick={handleVerifyEmail} 
                            variant="contained" 
                            style={{ background: '#7C3AED' }}
                        >
                            Verify Email
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Animations */}
                <style>{`
        .animate-fadein { animation: fadein 0.8s; }
        .animate-slideup-fadein { animation: slideupfadein 0.9s cubic-bezier(.39,.575,.565,1) both; }
        .animate-shake { animation: shake 0.3s; }
        @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideupfadein { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: none; } }
        @keyframes shake { 10%, 90% { transform: translateX(-2px); } 20%, 80% { transform: translateX(4px); } 30%, 50%, 70% { transform: translateX(-8px); } 40%, 60% { transform: translateX(8px); } }
      `}</style>
            </div>
        </div>
    );
};

export default Signup;
