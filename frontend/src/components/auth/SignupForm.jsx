import { useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Sparkles, UserPlus, Mail, Lock, User } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

const SignupForm = () => {
    const { signup, googleLogin } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
    });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
        if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Valid email is required';
        }
        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        setLoading(true);
        try {
            await signup(formData);
            toast.success('Account created! Please sign in.');
            navigate('/login');
        } catch (error) {
            console.error('Signup error:', error);
            toast.error(error.response?.data?.message || 'Signup failed');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            setLoading(true);
            await googleLogin(credentialResponse.credential);
            // AuthContext handles navigation after login
        } catch (error) {
            console.error('Google login error:', error);
            toast.error('Google login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-[#F7F5FF] dark:bg-[#111117] font-sans">
            {/* Left Side - Brand/Illustration */}
            <div className="hidden lg:flex lg:w-1/2 justify-center lg:justify-start items-center lg:items-start lg:pt-24 lg:pl-14 relative overflow-hidden">
                <div className="relative z-10 text-center lg:text-left px-12 transition-all duration-700">
                    <div className="flex justify-center mb-6">
                        <img src="/alphalogo.png" alt="AlphaKnowledge" className="w-20 h-20 object-contain" />
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-bold text-[#111827] dark:text-white mb-4 tracking-tight leading-tight">
                        Join <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-300 dark:to-blue-300">AlphaKnowledge</span>
                    </h1>
                    <p className="text-base text-gray-500 dark:text-gray-400 font-normal mb-10">
                        Start your journey to master problem solving today.
                    </p>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-16">
                <div className="max-w-md w-full space-y-8">
                    <div className="mb-10 text-center lg:text-left">
                        <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 tracking-tight mb-3">Create Account</h2>
                        <p className="text-base text-gray-500 dark:text-gray-400 font-normal">Join our community of developers.</p>
                    </div>

                    <div className="bg-white dark:bg-[var(--color-bg-card)] p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800">
                        <form className="space-y-5" onSubmit={handleSubmit}>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">First Name</label>
                                    <input
                                        name="firstName"
                                        type="text"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        className={`input-field h-12 rounded-xl focus:ring-indigo-500 ${errors.firstName ? 'border-red-500' : ''}`}
                                        placeholder="John"
                                    />
                                    {errors.firstName && <p className="mt-1 text-xs text-red-500">{errors.firstName}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Last Name</label>
                                    <input
                                        name="lastName"
                                        type="text"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        className={`input-field h-12 rounded-xl focus:ring-indigo-500 ${errors.lastName ? 'border-red-500' : ''}`}
                                        placeholder="Doe"
                                    />
                                    {errors.lastName && <p className="mt-1 text-xs text-red-500">{errors.lastName}</p>}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                                    <input
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className={`input-field pl-12 h-12 rounded-xl focus:ring-indigo-500 ${errors.email ? 'border-red-500' : ''}`}
                                        placeholder="john@example.com"
                                    />
                                </div>
                                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                                    <input
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={formData.password}
                                        onChange={handleChange}
                                        className={`input-field pl-12 h-12 rounded-xl focus:ring-indigo-500 ${errors.password ? 'border-red-500' : ''}`}
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-3.5 text-gray-400 hover:text-indigo-600"
                                    >
                                        {showPassword ? <Lock className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                                    </button>
                                </div>
                                {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full btn-primary h-12 rounded-xl font-semibold transition-all hover:-translate-y-0.5"
                            >
                                {loading ? 'Creating Account...' : 'Sign Up'}
                            </button>

                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-[var(--color-border-interactive)]"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-4 bg-white dark:bg-[var(--color-bg-card)] text-gray-500">Or continue with</span>
                                </div>
                            </div>

                            <div className="flex justify-center">
                                <GoogleLogin
                                    onSuccess={handleGoogleSuccess}
                                    onError={() => toast.error('Google Sign In failed')}
                                    useOneTap
                                    theme="filled_blue"
                                    shape="circle"
                                />
                            </div>

                            <p className="text-center text-sm text-gray-500 mt-6">
                                Already have an account?{' '}
                                <Link to="/login" className="text-indigo-600 font-semibold hover:underline">Sign In</Link>
                            </p>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignupForm;








