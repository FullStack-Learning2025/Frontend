import React, { useState, useEffect } from 'react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import studyIllustration from '@/assets/students-exam.png';
import purpleLogo from '@/assets/ExamWalk Purple Logo.svg';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, CheckCircle2, GraduationCap, UserCircle } from 'lucide-react';
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

    const handleResendEmailCode = async () => {
        const fallbackEmail = registeredEmail || (activeTab === 'teacher' ? teacherForm.email : studentForm.email);

        if (!fallbackEmail) {
            toast.error('Please provide an email before requesting a new code.');
            return;
        }

        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/users/send-verification-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: fallbackEmail }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to resend verification email');
            }

            toast.success('Verification email resent successfully!');
            setEmailVerificationTimer(120);
            setCanResendEmailCode(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to resend verification email';
            toast.error(message);
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
                    emailCode,
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
            const message = error instanceof Error ? error.message : 'Email verification failed';
            setEmailCodeError(message);
            toast.error(message);
        }
    };

    const isTeacher = activeTab === 'teacher';
    const activeForm = isTeacher ? teacherForm : studentForm;
    const formIdPrefix = isTeacher ? 'teacher' : 'student';

    const onboardingCopy = isTeacher
        ? {
            eyebrow: 'Teacher onboarding',
            title: 'Create your teacher account',
            subtitle: 'Publish engaging courses, manage exams effortlessly, and support students worldwide.',
            badge: 'Built for educators',
            panelTitle: 'Inspire learners everywhere',
            panelBody:
                'Design structured curricula, track cohorts in real time, and deliver high-impact assessments with ExamWalk.',
        }
        : {
            eyebrow: 'Student onboarding',
            title: 'Create your student account',
            subtitle: 'Access personalized courses, track your progress, and stay exam-ready with ExamWalk.',
            badge: 'Built for achievers',
            panelTitle: 'Level up your exam prep',
            panelBody:
                'Master every topic with adaptive practice sets, analytics, and supportive mentors guiding you to success.',
        };

    return (
        <>
            <div className="relative min-h-screen w-full overflow-hidden bg-background text-foreground">
                <div className="absolute inset-0 -z-10 overflow-hidden">
                    <div className="absolute top-[-28rem] left-[-12rem] h-[48rem] w-[48rem] rounded-full bg-primary/10 blur-3xl" />
                    <div className="absolute bottom-[-20rem] right-[-16rem] h-[44rem] w-[44rem] rounded-full bg-secondary/15 blur-3xl" />
                </div>

                <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-10">
                    <header className="mb-10 flex items-center gap-3" aria-label="ExamWalk">
                        <a href="/" className="flex items-center gap-3">
                            <img src={purpleLogo} alt="ExamWalk Logo" className="h-10 w-auto drop-shadow-sm" />
                            <div className="flex flex-col">
                                <span className="text-xl font-semibold text-primary">ExamWalk</span>
                                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                                    Master Exams with Confidence
                                </span>
                            </div>
                        </a>
                    </header>

                    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
                        <div className="order-2 rounded-3xl border border-border/60 bg-card/80 p-7 shadow-lg shadow-primary/5 backdrop-blur-sm sm:p-9 md:p-12 lg:order-1">
                            <div className="mb-8">
                                <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
                                    {onboardingCopy.eyebrow}
                                </p>
                                <h1 className="mb-2 text-3xl font-semibold text-foreground sm:text-4xl">
                                    {onboardingCopy.title}
                                </h1>
                                <p className="text-sm text-muted-foreground sm:text-base">{onboardingCopy.subtitle}</p>
                            </div>

                            <div className="mb-6">
                                <div className="relative mx-auto w-full max-w-sm">
                                    <div
                                        className="absolute left-1 top-1 bottom-1 rounded-xl bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 transition-transform duration-300 ease-out"
                                        style={{ width: 'calc(50% - 0.25rem)', transform: isTeacher ? 'translateX(0)' : 'translateX(calc(100% + 0.25rem))' }}
                                    />
                                    <div className="relative grid grid-cols-2 gap-2 rounded-2xl border border-border/60 bg-muted/40 p-1">
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('teacher')}
                                            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                                                isTeacher ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            <GraduationCap className="h-4 w-4" />
                                            Teacher
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('student')}
                                            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                                                !isTeacher ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            <UserCircle className="h-4 w-4" />
                                            Student
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                {formError && (
                                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                                        {formError}
                                    </div>
                                )}

                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-muted-foreground" htmlFor={`${formIdPrefix}-full-name`}>
                                            Full Name
                                        </label>
                                        <input
                                            id={`${formIdPrefix}-full-name`}
                                            type="text"
                                            name="fullName"
                                            value={activeForm.fullName}
                                            onChange={handleChange}
                                            required
                                            className="w-full rounded-xl border border-border bg-background/90 px-4 py-3 text-sm focus:outline-none focus:border-transparent focus:ring-2 focus:ring-primary transition-shadow"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-muted-foreground" htmlFor={`${formIdPrefix}-display-name`}>
                                            Display Name
                                        </label>
                                        <input
                                            id={`${formIdPrefix}-display-name`}
                                            type="text"
                                            name="displayName"
                                            value={activeForm.displayName}
                                            onChange={handleChange}
                                            required
                                            className="w-full rounded-xl border border-border bg-background/90 px-4 py-3 text-sm focus:outline-none focus:border-transparent focus:ring-2 focus:ring-primary transition-shadow"
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-muted-foreground" htmlFor={`${formIdPrefix}-email`}>
                                            Email Address
                                        </label>
                                        <input
                                            id={`${formIdPrefix}-email`}
                                            type="email"
                                            name="email"
                                            value={activeForm.email}
                                            onChange={handleChange}
                                            required
                                            className="w-full rounded-xl border border-border bg-background/90 px-4 py-3 text-sm focus:outline-none focus:border-transparent focus:ring-2 focus:ring-primary transition-shadow"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-muted-foreground" htmlFor={`${formIdPrefix}-phone`}>
                                            Contact Number
                                        </label>
                                        <PhoneInput
                                            country={'gb'}
                                            value={activeForm.phoneNumber}
                                            onChange={handlePhoneChange}
                                            inputClass="!w-full !rounded-xl !border !border-border !bg-background/90 !px-4 !py-3 !text-sm !focus:outline-none !focus:border-transparent !focus:ring-2 !focus:ring-primary !transition-shadow"
                                            buttonClass="!border !border-border !bg-background/80 !rounded-l-xl !w-[44px]"
                                            containerClass="mt-1"
                                            searchClass="!w-full !rounded-xl !border !border-border !bg-background/90 !px-3 !py-2 !focus:outline-none !focus:border-transparent !focus:ring-2 !focus:ring-primary"
                                            searchPlaceholder="Search country..."
                                            enableSearch
                                            searchNotFound="Country not found"
                                            inputProps={{
                                                required: true,
                                                name: 'phoneNumber',
                                            }}
                                            dropdownClass="!w-[320px] !max-h-[240px] !overflow-y-auto"
                                            countryCodeEditable={false}
                                            disableSearchIcon
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-muted-foreground" htmlFor={`${formIdPrefix}-password`}>
                                            Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                id={`${formIdPrefix}-password`}
                                                type={showPassword ? 'text' : 'password'}
                                                name="password"
                                                value={activeForm.password}
                                                onChange={handleChange}
                                                required
                                                className="w-full rounded-xl border border-border bg-background/90 px-4 py-3 text-sm focus:outline-none focus:border-transparent focus:ring-2 focus:ring-primary transition-shadow"
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
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-muted-foreground" htmlFor={`${formIdPrefix}-confirm-password`}>
                                            Confirm Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                id={`${formIdPrefix}-confirm-password`}
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                name="confirmPassword"
                                                value={activeForm.confirmPassword}
                                                onChange={handleChange}
                                                required
                                                className="w-full rounded-xl border border-border bg-background/90 px-4 py-3 text-sm focus:outline-none focus:border-transparent focus:ring-2 focus:ring-primary transition-shadow"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
                                            >
                                                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground" htmlFor={`${formIdPrefix}-profile-image`}>
                                        Profile Image (optional)
                                    </label>
                                    <input
                                        id={`${formIdPrefix}-profile-image`}
                                        type="file"
                                        name="profileImage"
                                        accept="image/*"
                                        onChange={handleChange}
                                        className="block w-full cursor-pointer rounded-xl border border-dashed border-border bg-background/70 px-4 py-3 text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-primary hover:file:bg-primary/20"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-foreground shadow-md shadow-primary/10 transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                                >
                                    {isSubmitting ? 'Submitting…' : 'Create account'}
                                    {!isSubmitting && <ArrowRight className="h-4 w-4" />}
                                </button>
                            </form>

                            <div className="mt-8 text-center text-sm text-muted-foreground">
                                Already have an account?{' '}
                                <a href="/login" className="font-semibold text-primary hover:text-primary/80">
                                    Log in instead
                                </a>
                            </div>
                        </div>

                        <div className="order-1 lg:order-2">
                            <div className="relative">
                                <div className="absolute -inset-2 rounded-[2.5rem] bg-gradient-to-br from-primary/25 via-secondary/20 to-accent/20 blur-2xl opacity-75" />
                                <div className="relative overflow-hidden rounded-[2.5rem] border border-border/50 bg-gradient-to-br from-background via-background/95 to-primary/5 shadow-xl">
                                    <div className="absolute inset-0 bg-grid-small opacity-[0.07]" />
                                    <div className="relative flex h-full flex-col justify-between p-10 md:p-14">
                                        <div className="space-y-4 max-w-sm">
                                            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                                                {onboardingCopy.badge}
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                            </span>
                                            <h2 className="text-3xl font-semibold text-foreground leading-tight">
                                                {onboardingCopy.panelTitle}
                                            </h2>
                                            <p className="text-sm text-muted-foreground">{onboardingCopy.panelBody}</p>
                                        </div>

                                        <div className="mt-10">
                                            <img
                                                src={studyIllustration}
                                                alt="ExamWalk onboarding illustration"
                                                className="mx-auto w-full max-w-lg drop-shadow-md"
                                                loading="lazy"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Dialog open={showCodeInput} onClose={() => setShowCodeInput(false)}>
                <DialogTitle>Verify Your Phone</DialogTitle>
                <DialogContent>
                    <div className="mb-2">Enter the verification code sent to your mobile number.</div>
                    <div className="mb-4 flex items-center justify-between">
                        <span className="text-sm text-gray-600">Having trouble with this number?</span>
                        <Button
                            onClick={() => setShowPhoneModal(true)}
                            variant="outlined"
                            style={{ color: '#7C3AED', borderColor: '#7C3AED' }}
                        >
                            Change Number
                        </Button>
                    </div>
                    <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="mb-2 w-full rounded-lg border border-gray-300 bg-white/70 px-3 py-2 transition-all duration-200 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]"
                        placeholder="Enter verification code"
                        autoFocus
                    />
                    {codeError && <div className="mb-2 text-sm text-red-500 animate-shake">{codeError}</div>}
                    <div className="mt-4 flex items-center justify-between">
                        <div className="text-sm text-gray-600">Time remaining: {formatTime(timer)}</div>
                        <Button
                            onClick={handleResendOTP}
                            disabled={!canResend}
                            style={{ color: '#7C3AED', opacity: !canResend ? 0.5 : 1, cursor: !canResend ? 'not-allowed' : 'pointer' }}
                        >
                            Resend OTP
                        </Button>
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowCodeInput(false)} color="secondary">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSendEmailVerification}
                        variant="outlined"
                        style={{ color: '#7C3AED', borderColor: '#7C3AED' }}
                    >
                        Email Verification
                    </Button>
                    <Button onClick={handleCodeVerify} variant="contained" style={{ background: '#7C3AED' }}>
                        Verify
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={showPhoneModal} onClose={() => setShowPhoneModal(false)}>
                <DialogTitle>Update Phone Number</DialogTitle>
                <DialogContent>
                    <div className="mb-2">Enter your new phone number.</div>
                    <PhoneInput
                        country={'gb'}
                        value={activeForm.phoneNumber}
                        onChange={handlePhoneChange}
                        inputClass="!w-full !rounded-xl !border !border-border !bg-background/90 !px-4 !py-3 !text-sm !focus:outline-none !focus:border-transparent !focus:ring-2 !focus:ring-primary !transition-shadow"
                        buttonClass="!border !border-border !bg-background/80 !rounded-l-xl !w-[44px]"
                        containerClass="mt-1"
                        searchClass="!w-full !rounded-xl !border !border-border !bg-background/90 !px-3 !py-2 !focus:outline-none !focus:border-transparent !focus:ring-2 !focus:ring-primary"
                        searchPlaceholder="Search country..."
                        enableSearch
                        searchNotFound="Country not found"
                        inputProps={{
                            required: true,
                            name: 'phoneNumber',
                        }}
                        dropdownClass="!w-[320px] !max-h-[240px] !overflow-y-auto"
                        countryCodeEditable={false}
                        disableSearchIcon
                    />
                    <div className="mt-4 flex gap-2">
                        <Button onClick={handleUpdatePhone} variant="contained" style={{ background: '#7C3AED', flex: 1 }}>
                            Update & Send OTP
                        </Button>
                        <Button
                            onClick={handleSendEmailVerification}
                            variant="outlined"
                            style={{ color: '#7C3AED', borderColor: '#7C3AED', flex: 1 }}
                        >
                            Email Verification
                        </Button>
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowPhoneModal(false)} color="secondary">
                        Cancel
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={showEmailVerificationModal} onClose={() => setShowEmailVerificationModal(false)}>
                <DialogTitle>Verify Your Email</DialogTitle>
                <DialogContent>
                    <div className="mb-2">Enter the verification code sent to your email address.</div>
                    <input
                        type="text"
                        value={emailCode}
                        onChange={(e) => setEmailCode(e.target.value)}
                        className="mb-2 w-full rounded-lg border border-gray-300 bg-white/70 px-3 py-2 transition-all duration-200 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]"
                        placeholder="Enter verification code"
                        autoFocus
                    />
                    {emailCodeError && <div className="mb-2 text-sm text-red-500 animate-shake">{emailCodeError}</div>}
                    <div className="mt-4 flex items-center justify-between">
                        <div className="text-sm text-gray-600">Time remaining: {formatTime(emailVerificationTimer)}</div>
                        <Button
                            onClick={handleResendEmailCode}
                            disabled={!canResendEmailCode}
                            style={{ color: '#7C3AED', opacity: !canResendEmailCode ? 0.5 : 1, cursor: !canResendEmailCode ? 'not-allowed' : 'pointer' }}
                        >
                            Resend Code
                        </Button>
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowEmailVerificationModal(false)} color="secondary">
                        Cancel
                    </Button>
                    <Button onClick={handleVerifyEmail} variant="contained" style={{ background: '#7C3AED' }}>
                        Verify Email
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default Signup;
