'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle2, XCircle, AlertCircle, RefreshCw, Shield, ShieldCheck, ShieldAlert } from 'lucide-react';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const router = useRouter();

  const [step, setStep] = useState<'loading' | 'valid' | 'expired' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) {
      setStep('error');
      setErrorMessage('Invalid link or missing ID.');
      return;
    }

    // Check status via change-password API logic (reusing it)
    fetch(`/api/change-password?id=${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setStep('error');
          setErrorMessage(data.error);
        } else if (data.expired) {
          setStep('expired');
        } else {
          setStep('valid');
        }
      })
      .catch(err => {
        setStep('error');
        setErrorMessage('Failed to verify link. Please try again.');
      });
  }, [id]);

  // Password strength calculation
  const getPasswordStrength = (pass: string): { score: number; label: string; color: string; icon: React.ReactNode } => {
    let score = 0;

    if (pass.length >= 8) score++;
    if (pass.length >= 12) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 2) {
      return {
        score,
        label: 'Weak',
        color: 'from-red-500 to-red-400',
        icon: <ShieldAlert className="w-4 h-4" />
      };
    } else if (score <= 4) {
      return {
        score,
        label: 'Medium',
        color: 'from-yellow-500 to-yellow-400',
        icon: <Shield className="w-4 h-4" />
      };
    } else {
      return {
        score,
        label: 'Strong',
        color: 'from-green-500 to-green-400',
        icon: <ShieldCheck className="w-4 h-4" />
      };
    }
  };

  // Password requirements checklist
  const getPasswordRequirements = (pass: string) => [
    { met: pass.length >= 8, label: 'At least 8 characters' },
    { met: /[A-Z]/.test(pass), label: 'One uppercase letter' },
    { met: /[a-z]/.test(pass), label: 'One lowercase letter' },
    { met: /[0-9]/.test(pass), label: 'One number' },
    { met: /[^A-Za-z0-9]/.test(pass), label: 'One special character' },
  ];

  const strength = password ? getPasswordStrength(password) : null;
  const requirements = password ? getPasswordRequirements(password) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMessage("Passwords don't match");
      return;
    }
    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters");
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, password })
      });
      const data = await res.json();

      if (data.success) {
        setStep('success');
      } else {
        setErrorMessage(data.error || 'Failed to update password');
      }
    } catch (err) {
      setErrorMessage('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          {/* Loading State */}
          {step === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 text-center shadow-2xl"
            >
              <RefreshCw className="w-12 h-12 text-blue-400 mx-auto animate-spin mb-4" />
              <h2 className="text-xl font-semibold text-white">Verifying Link...</h2>
            </motion.div>
          )}

          {/* Expired State */}
          {step === 'expired' && (
            <motion.div
              key="expired"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-red-500/30 rounded-2xl p-8 text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500" />
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-white mb-2">Link Expired</h2>
              <p className="text-slate-400 mb-6">This password setup link is no longer valid or has already been used.</p>
              <button
                onClick={() => router.push('/auth/login')}
                className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all font-medium border border-white/10"
              >
                Back to Login
              </button>
            </motion.div>
          )}

          {/* Valid Form State */}
          {step === 'valid' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <Lock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-center text-slate-900 dark:text-white mb-2">Set Your Password</h2>
                <p className="text-center text-slate-500 dark:text-slate-400 text-sm">
                  Create a secure password to access your account.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="p-8 bg-white dark:bg-slate-900 space-y-6">
                {errorMessage && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {errorMessage}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all dark:text-white"
                      placeholder="••••••••"
                      required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Password Strength Indicator */}
                {password && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3"
                  >
                    {/* Strength Bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500 dark:text-slate-400">Password strength:</span>
                        <span className={`text-sm font-medium flex items-center gap-1.5 ${strength?.label === 'Weak' ? 'text-red-500' :
                            strength?.label === 'Medium' ? 'text-yellow-600' :
                              'text-green-600'
                          }`}>
                          {strength?.icon}
                          {strength?.label}
                        </span>
                      </div>
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5, 6].map((index) => (
                          <div
                            key={index}
                            className={`h-2 flex-1 rounded-full transition-all duration-300 ${strength && index <= strength.score
                                ? `bg-gradient-to-r ${strength.color}`
                                : 'bg-slate-200 dark:bg-slate-700'
                              }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Requirements Checklist */}
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-2">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                        Password requirements:
                      </p>
                      {requirements?.map((req, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          {req.met ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600 flex-shrink-0" />
                          )}
                          <span className={req.met ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}>
                            {req.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Confirm Password</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border outline-none transition-all dark:text-white ${confirmPassword && password !== confirmPassword
                        ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 focus:ring-2 focus:ring-red-500'
                        : confirmPassword && password === confirmPassword
                          ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 focus:ring-2 focus:ring-green-500'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500'
                      }`}
                    placeholder="••••••••"
                    required
                  />
                  {confirmPassword && (
                    <div className="flex items-center gap-1.5">
                      {password === confirmPassword ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-600 dark:text-green-400">Passwords match</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-red-500" />
                          <span className="text-sm text-red-600 dark:text-red-400">Passwords don't match</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting || password !== confirmPassword || ((strength?.score ?? 0) < 3)}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-blue-500/25 font-medium transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Setting Password...
                    </>
                  ) : (
                    'Set Password'
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {/* Success State */}
          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-10 text-center max-w-md w-full"
            >
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Password Set!</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8">
                Your account is now ready. You can log in with your new password.
              </p>
              <button
                onClick={() => router.push('/auth/login')}
                className="w-full py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-medium hover:opacity-90 transition-all"
              >
                Go to Login
              </button>
            </motion.div>
          )}

          {/* General Error State */}
          {step === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-white/10 backdrop-blur-md text-white p-8 rounded-2xl border border-white/20 text-center"
            >
              <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Error</h3>
              <p className="text-white/70 mb-6">{errorMessage}</p>
              <button
                onClick={() => router.push('/auth/login')}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                Go to Login
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}