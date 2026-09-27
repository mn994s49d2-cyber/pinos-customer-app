import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Award,
  Mail,
  Lock,
  User,
  Phone,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  Gift,
} from 'lucide-react';
import { CustomerUser } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'register';
  onAuthSuccess: (user: CustomerUser) => void;
  onContinueAsGuest?: () => void;
  promptReason?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin',
  onAuthSuccess,
  onContinueAsGuest,
  promptReason,
}) => {
  const [mode, setMode] = useState<'signin' | 'register'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // States
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === 'register') {
        if (!name.trim()) {
          setErrorMessage('Please enter your full name.');
          setLoading(false);
          return;
        }
        if (!email.trim() || !email.includes('@')) {
          setErrorMessage('Please enter a valid email address.');
          setLoading(false);
          return;
        }
        if (!password || password.length < 4) {
          setErrorMessage('Password must be at least 4 characters long.');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            password,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to register account');
        }

        setSuccessMessage(`Welcome to Pizza Pino Club, ${data.user.name}! 100 Pino Points credited.`);
        setTimeout(() => {
          onAuthSuccess(data.user);
          onClose();
        }, 700);
      } else {
        // Sign In
        if (!email.trim() || !email.includes('@')) {
          setErrorMessage('Please enter your registered email address.');
          setLoading(false);
          return;
        }
        if (!password) {
          setErrorMessage('Please enter your password.');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Invalid login details.');
        }

        setSuccessMessage(`Welcome back, ${data.user.name}!`);
        setTimeout(() => {
          onAuthSuccess(data.user);
          onClose();
        }, 600);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemoOliver = () => {
    setEmail('oliver.talbot2406@gmail.com');
    setPassword('password123');
    setMode('signin');
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div
        id="customer-auth-dialog"
        className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Banner Header */}
        <div className="relative bg-gradient-to-br from-red-600 via-red-700 to-red-800 text-white p-5 sm:p-6 overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />

          <div className="flex items-start justify-between relative z-10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider mb-2 backdrop-blur-xs">
                <Sparkles className="w-3 h-3 text-red-200" />
                Pizza Pino Club
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {mode === 'register' ? 'Create Your Account' : 'Welcome Back'}
              </h2>
              <p className="text-xs font-bold text-white/90 mt-1 max-w-xs">
                {mode === 'register'
                  ? 'Join for free and unlock 100 welcome Pino Points & exclusive rewards.'
                  : 'Sign in to access your Pino Points balance and past pizza orders.'}
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-black/20 hover:bg-black/30 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Prompt Reason Banner */}
          {promptReason && (
            <div className="mt-3 p-2.5 rounded-xl bg-black/20 border border-white/20 text-xs font-bold text-white flex items-center gap-2">
              <Gift className="w-4 h-4 shrink-0 text-white" />
              <span>{promptReason}</span>
            </div>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60 p-1.5">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
              mode === 'signin'
                ? 'bg-white dark:bg-stone-800 text-stone-950 dark:text-white shadow-xs'
                : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'register'
                ? 'bg-white dark:bg-stone-800 text-stone-950 dark:text-white shadow-xs'
                : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <span>Register</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-red-600 text-white rounded-full font-black">
              +100 pts
            </span>
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs font-bold text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-stone-500 dark:text-stone-400 block mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Oliver Talbot"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-bold text-stone-900 dark:text-white focus:outline-hidden focus:border-red-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-stone-500 dark:text-stone-400 block mb-1">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-bold text-stone-900 dark:text-white focus:outline-hidden focus:border-red-500"
              />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-stone-500 dark:text-stone-400 block mb-1">
                Mobile Number (Optional)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                <input
                  type="tel"
                  placeholder="07700 900123"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-bold text-stone-900 dark:text-white focus:outline-hidden focus:border-red-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-stone-500 dark:text-stone-400 block mb-1">
              Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-bold text-stone-900 dark:text-white focus:outline-hidden focus:border-red-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            id="auth-submit-button"
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-transform active:scale-98 shadow-sm cursor-pointer disabled:opacity-60"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>
                  {mode === 'register' ? 'Register & Claim 100 Points' : 'Sign In to Account'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {mode === 'signin' && (
            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={handleFillDemoOliver}
                className="text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer inline-flex items-center gap-1"
              >
                <span>Demo sign-in: Oliver T. (oliver.talbot2406@gmail.com)</span>
              </button>
            </div>
          )}

          {onContinueAsGuest && (
            <div className="pt-2 border-t border-stone-100 dark:border-stone-800 text-center">
              <button
                type="button"
                onClick={() => {
                  onContinueAsGuest();
                  onClose();
                }}
                className="text-xs font-bold text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 cursor-pointer"
              >
                Skip and continue as Guest →
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
