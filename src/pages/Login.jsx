import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserPlus, Loader2, AlertTriangle, Dumbbell } from 'lucide-react';
import PrimaryButton from '../components/PrimaryButton';

const ValidationTooltip = ({ message, visible }) => {
    if (!visible) return null;
    return (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
            <div className="bg-brand-500 text-black px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg whitespace-nowrap">
                <AlertTriangle className="w-4 h-4" />
                {message}
                {/* Triangle pointing down */}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-brand-500 rotate-45"></div>
            </div>
        </div>
    );
};

const Login = () => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [validationError, setValidationError] = useState({ field: null, message: '' });
    const { signIn, signUp } = useAuth();

    // Clear validation error when user types
    useEffect(() => {
        setValidationError({ field: null, message: '' });
    }, [email, password, isSignUp]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Manual Validation
        if (!email) {
            setValidationError({ field: 'email', message: 'Please insert email' });
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setValidationError({ field: 'email', message: 'Invalid email format' });
            return;
        }
        if (!password) {
            setValidationError({ field: 'password', message: 'Please insert password' });
            return;
        }
        if (password.length < 6) {
            setValidationError({ field: 'password', message: 'Minimum 6 characters' });
            return;
        }

        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                await signUp(email, password);
                setError({ type: 'success', message: "Check your email to confirm your account!" });
            } else {
                await signIn(email, password);
            }
        } catch (err) {
            setError({ type: 'error', message: err.message || "An error occurred" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-dvh flex items-center justify-center bg-[#000000] p-6 font-sans relative overflow-hidden selection:bg-brand-500/30">
            {/* Background decorative elements - Neon Glows */}
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-brand-500/5 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-brand-500/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1.5s' }}></div>

            <div className="w-full max-w-sm flex flex-col gap-8 animate-fade-in relative z-10">
                {/* Logo / Header Section */}
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-16 h-16 rounded-[2rem] bg-[#171717] border border-[#262626] overflow-hidden flex items-center justify-center text-brand-500 shadow-xl shadow-brand-500/5">
                        <img src="/icon.png" alt="Strive Logo" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em] mb-1">Strive</span>
                        <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">
                            {isSignUp ? 'Join' : 'Welcome'}
                        </h1>
                    </div>
                </div>

                {/* Form Container */}
                <div className="card-glass border-[#262626]/50 shadow-2xl">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-1 relative">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#404040] ml-1">Email Address</span>
                                <ValidationTooltip
                                    message={validationError.message}
                                    visible={validationError.field === 'email'}
                                />
                                <input
                                    type="email"
                                    placeholder="your@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={`input-field ${validationError.field === 'email' ? 'border-brand-500 ring-1 ring-brand-500' : ''}`}
                                    autoFocus
                                />
                            </div>

                            <div className="flex flex-col gap-1 relative">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#404040] ml-1">Password</span>
                                <ValidationTooltip
                                    message={validationError.message}
                                    visible={validationError.field === 'password'}
                                />
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={`input-field ${validationError.field === 'password' ? 'border-brand-500 ring-1 ring-brand-500' : ''}`}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className={`p-4 rounded-2xl flex items-start gap-3 border shadow-sm animate-slide-up ${error.type === 'success'
                                ? 'bg-[#D4FF00]/10 border-[#D4FF00]/20 text-[#D4FF00]'
                                : 'bg-red-500/10 border-red-500/20 text-red-400'
                                }`}>
                                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                                <p className="text-xs font-bold leading-relaxed">{error.message}</p>
                            </div>
                        )}

                        <PrimaryButton
                            type="submit"
                            loading={loading}
                            className="mt-2 py-5"
                        >
                            {isSignUp ? (
                                <><UserPlus className="w-5 h-5 mr-1" /> Create Account</>
                            ) : (
                                <><LogIn className="w-5 h-5 mr-1" /> Login</>
                            )}
                        </PrimaryButton>
                    </form>

                    <div className="mt-8 flex flex-col items-center gap-4">
                        <div className="w-8 h-[1px] bg-[#171717]"></div>
                        <button
                            onClick={() => {
                                setIsSignUp(!isSignUp);
                                setError(null);
                                setValidationError({ field: null, message: '' });
                            }}
                            className="text-[#A3A3A3] hover:text-brand-500 transition-colors text-[11px] font-black uppercase tracking-[0.1em]"
                        >
                            {isSignUp ? 'Already have an account? Sign In' : 'New here? Register'}
                        </button>
                    </div>
                </div>

                {/* Footer simple mark (hidden as requested by user's previous edit) */}
            </div>
        </div>
    );
};

export default Login;
