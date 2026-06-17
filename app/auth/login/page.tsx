"use client"
import { loginAction, forgotPasswordAction, verify2FAAndLogin, checkSalesforceConfigured, saveSalesforceCredentials, checkSession } from "./actions"
import { useEffect, useState, useActionState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { Mail, Lock, ArrowRight, Loader2, CheckCircle2, Ban, Plug } from "lucide-react"

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, {})
  const [verifyState, verifyAction, verifyPending] = useActionState(verify2FAAndLogin, {})
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [otp, setOtp] = useState("")
  const [resetStatus, setResetStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [isResetting, setIsResetting] = useState(false)
  const searchParams = useSearchParams()

  const [isConfigured, setIsConfigured] = useState<boolean | null>(null)
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [connectStep, setConnectStep] = useState(1) // 1: Credentials, 2: 2FA, 3: Security Token
  const [authType, setAuthType] = useState<'otp' | 'mobile'>('otp')
  const [connectLoading, setConnectLoading] = useState(false)
  const [connectError, setConnectError] = useState("")
  const [showPlaywrightOption, setShowPlaywrightOption] = useState(false)
  
  const [sfEnv, setSfEnv] = useState("login.salesforce.com")
  const [sfUser, setSfUser] = useState("")
  const [sfPass, setSfPass] = useState("")
  const [sfSessionId, setSfSessionId] = useState("")
  const [sfCode, setSfCode] = useState("")
  const [sfToken, setSfToken] = useState("")

  useEffect(() => {
    checkSalesforceConfigured().then(res => setIsConfigured(res))
    checkSession().then(hasSession => {
      if (hasSession) {
        const redirectUrl = searchParams.get('redirect') || '/dashboard';
        router.push(redirectUrl);
      }
    })
  }, [router, searchParams])

  useEffect(() => {
    if (state.success || verifyState.success) {
        const redirectUrl = searchParams.get('redirect') || '/dashboard';
        router.push(redirectUrl);
    }
  }, [state.success, verifyState.success, router])

  const handleForgotPassword = async (e: React.MouseEvent) => {
    e.preventDefault()
    setResetStatus(null)
    
    if (!email) {
        setResetStatus({ type: 'error', message: "Please enter your Email or Employee ID first" })
        return
    }

    setIsResetting(true)
    try {
        const result = await forgotPasswordAction(email)
        if (result.success) {
            setResetStatus({ type: 'success', message: result.message || "Reset link sent successfully" })
        } else {
            setResetStatus({ type: 'error', message: result.error || "Failed to send reset link" })
        }
    } catch (err) {
        setResetStatus({ type: 'error', message: "An unexpected error occurred" })
    } finally {
        setIsResetting(false)
    }
  }

  const handleConnectStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnectLoading(true);
    setConnectError("");
    setShowPlaywrightOption(false);
    
    try {
      const res = await fetch('/api/auth/salesforce/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_login', envUrl: sfEnv, username: sfUser, password: sfPass, token: sfToken })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }
      
      await saveSalesforceCredentials(sfUser, sfPass, sfToken);
      setIsConfigured(true);
      setShowConnectModal(false);
      
    } catch (err: any) {
      setConnectError(`${err.message}. If your security token is invalid or missing, you can generate a new one below.`);
      setShowPlaywrightOption(true);
    } finally {
      setConnectLoading(false);
    }
  };

  const handlePlaywrightStart = async () => {
    setConnectLoading(true);
    setConnectError("");
    try {
      const res = await fetch('/api/auth/salesforce/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', envUrl: sfEnv, username: sfUser, password: sfPass })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Connection failed');
      
      if (data.requires2FA) {
        setSfSessionId(data.sessionId);
        setAuthType(data.type || 'otp');
        setConnectStep(2);
      } else {
        setConnectStep(3);
      }
    } catch (err: any) {
      setConnectError(err.message);
    } finally {
      setConnectLoading(false);
    }
  };

  const handleConnectVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnectLoading(true);
    setConnectError("");
    try {
      const res = await fetch('/api/auth/salesforce/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', sessionId: sfSessionId, code: sfCode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      
      setConnectStep(3);
    } catch (err: any) {
      setConnectError(err.message);
    } finally {
      setConnectLoading(false);
    }
  };

  const handleMobileAuthCheck = async () => {
    setConnectLoading(true);
    setConnectError("");
    try {
      const res = await fetch('/api/auth/salesforce/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'wait_for_mobile_auth', sessionId: sfSessionId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      
      setConnectStep(3);
    } catch (err: any) {
      setConnectError(err.message);
    } finally {
      setConnectLoading(false);
    }
  };

  const handleConnectSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnectLoading(true);
    setConnectError("");
    try {
      await saveSalesforceCredentials(sfUser, sfPass, sfToken);
      setIsConfigured(true);
      setShowConnectModal(false);
    } catch (err: any) {
      setConnectError('Failed to save credentials');
    } finally {
      setConnectLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex overflow-hidden bg-slate-50 flex-row-reverse relative">
      {/* Top Right Connect Button */}
      {isConfigured === false && (
        <div className="absolute top-6 right-6 z-50">
          <button 
            onClick={() => setShowConnectModal(true)}
            className="flex items-center gap-2 bg-white text-slate-800 px-4 py-2 rounded-xl shadow-lg border border-slate-200 hover:bg-slate-50 transition-colors font-medium text-sm cursor-pointer"
          >
            <Plug className="w-4 h-4 text-blue-600" />
            Connect Salesforce
          </button>
        </div>
      )}

      {/* Connect Modal */}
      <AnimatePresence>
        {showConnectModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#16325c]/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-[4px] shadow-2xl w-full max-w-[400px] relative overflow-hidden"
            >
              {/* Close Button */}
              <button 
                onClick={() => setShowConnectModal(false)} 
                className="absolute top-4 right-4 text-[#706e6b] hover:text-[#080707] z-10 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              <div className="p-8 pb-10">
                <div className="flex justify-center mb-8 mt-2">
                  <img src="/logo214.svg" alt="Salesforce" width={160} height={112} className="h-14 w-auto" />
                </div>

                {connectError && (
                  <div className="mb-6 p-3 bg-[#fff1f1] text-[#c23934] rounded-[4px] text-sm border border-[#c23934]/30">
                    {connectError}
                  </div>
                )}

                {connectStep === 1 && (
                  <form onSubmit={handleConnectStart} className="space-y-5">
                    <div>
                      <label htmlFor="sfEnv" className="block text-[13px] text-[#3e3e3c] mb-1.5">Environment URL</label>
                      <input 
                        id="sfEnv"
                        name="url"
                        type="text" 
                        required 
                        value={sfEnv} 
                        onChange={e => setSfEnv(e.target.value)}
                        placeholder="login.salesforce.com"
                        pattern="^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
                        title="Please enter a valid Salesforce environment URL (e.g. login.salesforce.com)"
                        autoComplete="url"
                        className="w-full border border-[#d8dde6] rounded-[4px] px-3 py-2.5 text-[14px] focus:border-[#1b96ff] focus:ring-1 focus:ring-[#1b96ff] outline-none text-[#16325c] bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label htmlFor="sfUser" className="block text-[13px] text-[#3e3e3c] mb-1.5">Username</label>
                      <input 
                        id="sfUser"
                        name="username"
                        type="email" 
                        required 
                        value={sfUser} 
                        onChange={e => setSfUser(e.target.value)}
                        placeholder="name@company.com"
                        autoComplete="username"
                        className="w-full border border-[#d8dde6] rounded-[4px] px-3 py-2.5 text-[14px] focus:border-[#1b96ff] focus:ring-1 focus:ring-[#1b96ff] outline-none text-[#16325c] bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label htmlFor="sfPass" className="block text-[13px] text-[#3e3e3c] mb-1.5">Password</label>
                      <input 
                        id="sfPass"
                        name="password"
                        type="password" 
                        required 
                        value={sfPass} 
                        onChange={e => setSfPass(e.target.value)}
                        placeholder="Password"
                        minLength={8}
                        autoComplete="current-password"
                        className="w-full border border-[#d8dde6] rounded-[4px] px-3 py-2.5 text-[14px] focus:border-[#1b96ff] focus:ring-1 focus:ring-[#1b96ff] outline-none text-[#16325c] bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label htmlFor="sfTokenStep1" className="block text-[13px] text-[#3e3e3c] mb-1.5">Security Token</label>
                      <input 
                        id="sfTokenStep1"
                        name="token"
                        type="text" 
                        value={sfToken} 
                        onChange={e => setSfToken(e.target.value)}
                        placeholder="Paste your security token (optional if generating new)"
                        className="w-full border border-[#d8dde6] rounded-[4px] px-3 py-2.5 text-[14px] focus:border-[#1b96ff] focus:ring-1 focus:ring-[#1b96ff] outline-none text-[#16325c] bg-white transition-all"
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={connectLoading}
                      className="w-full bg-[#0070d2] hover:bg-[#005fb2] text-white font-medium py-3 px-4 rounded-[4px] flex justify-center items-center gap-2 mt-6 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {connectLoading && !showPlaywrightOption && <Loader2 className="w-4 h-4 animate-spin" />}
                      Log In & Save
                    </button>
                    
                    {showPlaywrightOption && (
                        <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                            <p className="text-[13px] text-[#3e3e3c] mb-3">Need to generate a new security token?</p>
                            <button 
                              type="button" 
                              onClick={handlePlaywrightStart}
                              disabled={connectLoading}
                              className="w-full bg-white border border-[#d8dde6] hover:bg-slate-50 text-[#0070d2] font-medium py-2.5 px-4 rounded-[4px] flex justify-center items-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                              {connectLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                              Generate New Security Token
                            </button>
                        </div>
                    )}
                  </form>
                )}

                {connectStep === 2 && (
                  <form onSubmit={handleConnectVerify} className="space-y-5">
                    {authType === 'mobile' ? (
                      <div className="text-center">
                        <h2 className="text-[20px] font-normal text-[#16325c] mb-4">Check Your Mobile Device</h2>
                        <p className="text-[14px] text-[#3e3e3c] mb-6">
                          Salesforce is requesting approval from your Authenticator app. 
                          Please open your mobile device and approve the login request.
                        </p>
                        <button 
                          type="button" 
                          onClick={handleMobileAuthCheck}
                          disabled={connectLoading}
                          className="w-full bg-[#0070d2] hover:bg-[#005fb2] text-white font-medium py-3 px-4 rounded-[4px] flex justify-center items-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          {connectLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                          I Have Approved It
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <h2 className="text-[20px] font-normal text-[#16325c] mb-4">Verify Your Identity</h2>
                        <p className="text-[14px] text-[#3e3e3c] mb-6">
                          We've sent you a verification code. Please enter it below.
                        </p>
                        <div className="text-left mb-6">
                          <label className="block text-[13px] text-[#3e3e3c] mb-1.5">Verification Code</label>
                          <input 
                            type="text" 
                            required 
                            value={sfCode} 
                            onChange={e => setSfCode(e.target.value.replace(/\D/g, ''))}
                            pattern="\d{5,6}"
                            title="Please enter a valid 5 or 6 digit verification code"
                            className="w-full border border-[#d8dde6] rounded-[4px] px-3 py-2.5 text-[14px] focus:border-[#1b96ff] focus:ring-1 focus:ring-[#1b96ff] outline-none text-[#16325c] bg-white transition-all text-center tracking-widest"
                            placeholder="000000"
                            maxLength={6}
                          />
                        </div>
                        <button 
                          type="submit" 
                          disabled={connectLoading}
                          className="w-full bg-[#0070d2] hover:bg-[#005fb2] text-white font-medium py-3 px-4 rounded-[4px] flex justify-center items-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          {connectLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                          Verify
                        </button>
                      </div>
                    )}
                  </form>
                )}

                {connectStep === 3 && (
                  <form onSubmit={handleConnectSave} className="space-y-5">
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-full bg-[#e8f5e9] flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-6 h-6 text-[#2e844a]" />
                      </div>
                      <h2 className="text-[20px] font-normal text-[#16325c] mb-2">Setup Almost Complete</h2>
                      <p className="text-[14px] text-[#3e3e3c] mb-6">
                        Salesforce has sent a new security token to your email. Enter it below to finish setup.
                      </p>
                    </div>
                    <div className="text-left mb-6">
                      <label className="block text-[13px] text-[#3e3e3c] mb-1.5">Security Token</label>
                      <input 
                        type="text" 
                        required 
                        value={sfToken} 
                        onChange={e => setSfToken(e.target.value)}
                        minLength={10}
                        className="w-full border border-[#d8dde6] rounded-[4px] px-3 py-2.5 text-[14px] focus:border-[#1b96ff] focus:ring-1 focus:ring-[#1b96ff] outline-none text-[#16325c] bg-white transition-all"
                        placeholder="Paste your security token"
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={connectLoading}
                      className="w-full bg-[#0070d2] hover:bg-[#005fb2] text-white font-medium py-3 px-4 rounded-[4px] flex justify-center items-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {connectLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      Save Connection
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left Side - Visual Showcase */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden items-center justify-center">
        <div className="absolute inset-0 z-0">
             <div className="absolute top-0 -left-1/4 w-full h-full bg-gradient-to-br from-cyan-500/30 to-blue-600/30 blur-[150px] animate-pulse" style={{ animationDuration: '10s' }} />
             <div className="absolute bottom-0 -right-1/4 w-full h-full bg-gradient-to-tl from-purple-500/30 to-indigo-600/30 blur-[150px] animate-pulse" style={{ animationDuration: '8s' }} />
             <div className="absolute inset-0 opacity-10 mix-blend-overlay"></div>
        </div>

        <div className="relative z-10 p-12 text-white max-w-xl">
             <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
             >
                <div className="w-16 h-16 bg-white/100 backdrop-blur-md rounded-2xl flex items-center justify-center mb-8 border border-white/20 shadow-xl">
                    <img src="/new_mv_logo.png" alt="MV Portal Logo" width={40} height={40} className="object-contain" />
                </div>
                <h1 className="text-5xl font-bold mb-6 leading-tight">
                    Welcome to <br />
                    <span className="bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">MV Portal</span>
                </h1>
                <p className="text-lg text-slate-300 mb-8 leading-relaxed">
                    Streamline your HR operations with our comprehensive management system. 
                    Experience the future of workplace efficiency.
                </p>

                <div className="grid grid-cols-2 gap-4">
                    {[
                        "Employee Management", "Leave Tracking", "Payroll Processing", "Asset Management"
                    ].map((feature, i) => (
                        <div key={i} className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/5 backdrop-blur-sm">
                            <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                            <span className="text-sm font-medium text-slate-200">{feature}</span>
                        </div>
                    ))}
                </div>
             </motion.div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white/50 backdrop-blur-xl">
         <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md"
         >
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 md:p-12 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-500 to-blue-600"></div>
                
                <div className="text-center mb-10">
                    <div className="inline-block lg:hidden mb-4 p-3 bg-slate-50 rounded-xl">
                        <img src="/new_mv_logo.png" alt="Logo" width={40} height={40} />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-800 mb-2">Sign In</h2>
                    <p className="text-slate-500">Access your employee dashboard</p>
                </div>

                <form action={state.twoFactorRequired ? verifyAction : action} className="space-y-6">
                    {(state.error || verifyState.error) && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
                        >
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"/></svg>
                            {state.error || verifyState.error}
                        </motion.div>
                    )}

                    {state.accountInactive ? (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center space-y-6 py-4"
                        >
                            <div className="relative w-24 h-24 mx-auto">
                                <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-20 duration-1000"></div>
                                <div className="relative bg-red-50 w-full h-full rounded-full flex items-center justify-center border-2 border-red-100">
                                    <Ban className="w-10 h-10 text-red-500" />
                                </div>
                            </div>
                            
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900">Access Revoked</h3>
                                <p className="text-slate-500 mt-2 max-w-xs mx-auto">
                                    Your account access has been temporarily suspended by the administrator.
                                </p>
                            </div>

                            <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600 border border-slate-100">
                                <p>Please contact your HR representative or IT support to resolve this issue.</p>
                                <div className="mt-3 font-medium text-slate-800 bg-white py-2 px-3 rounded-lg border border-slate-200 inline-block">
                                    info@mvportal.com
                                </div>
                            </div>

                            <button 
                                type="button"
                                onClick={() => window.location.reload()}
                                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                Back to Login
                            </button>
                        </motion.div>
                    ) : state.twoFactorRequired ? (
                         <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                             <input type="hidden" name="employeeId" value={state.employeeId} />
                             
                             <div className="text-center">
                                 <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                     <Lock className="w-8 h-8" />
                                 </div>
                                 <h3 className="text-xl font-bold text-slate-800">Two-Factor Authentication</h3>
                                 <p className="text-slate-500 text-sm mt-2">
                                     Enter the 6-digit code from your authenticator app for <span className="font-semibold">{state.email}</span>
                                 </p>
                             </div>

                             <div className="space-y-2">
                                 <label className="text-sm font-semibold text-slate-700 ml-1">Verification Code</label>
                                 <input
                                     name="code"
                                     type="text"
                                     value={otp}
                                     onChange={(e) => {
                                         const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6)
                                         setOtp(val)
                                     }}
                                     className="w-full text-center text-3xl tracking-[0.5em] font-mono py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium text-slate-800 placeholder:text-slate-300"
                                     placeholder="000000"
                                     autoFocus
                                     required
                                 />
                             </div>

                             <div className="flex items-center gap-2">
                                 <input type="checkbox" name="trustDevice" id="trustDevice" className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                 <label htmlFor="trustDevice" className="text-sm text-slate-600 select-none cursor-pointer">Trust this device for 30 days</label>
                             </div>

                             <button
                                 type="submit"
                                 disabled={verifyPending || otp.length !== 6}
                                 className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-purple-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                             >
                                 {verifyPending ? (
                                     <Loader2 className="w-5 h-5 animate-spin" />
                                 ) : (
                                     <>Verify <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
                                 )}
                             </button>
                             
                             <button type="button" onClick={() => window.location.reload()} className="w-full text-sm text-slate-500 hover:text-slate-700">
                                 Back to Login
                             </button>
                         </div>
                    ) : (
                        <>
                             {resetStatus && (
                                  <motion.div 
                                     initial={{ opacity: 0, y: -10 }}
                                     animate={{ opacity: 1, y: 0 }}
                                     className={`px-4 py-3 rounded-xl text-sm flex items-center gap-2 border ${
                                         resetStatus.type === 'success' 
                                             ? 'bg-green-50 border-green-100 text-green-600' 
                                             : 'bg-red-50 border-red-100 text-red-600'
                                     }`}
                                 >
                                     {resetStatus.type === 'success' ? (
                                         <CheckCircle2 className="w-4 h-4" />
                                     ) : (
                                         <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"/></svg>
                                     )}
                                     {resetStatus.message}
                                 </motion.div>
                             )}
         
                             <div className="space-y-2">
                                 <label className="text-sm font-semibold text-slate-700 ml-1">Email / Employee ID</label>
                                 <div className="relative group">
                                     <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                     <input
                                         name="identifier"
                                         type="text"
                                         value={email}
                                         onChange={(e) => setEmail(e.target.value)}
                                         className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium text-slate-800 placeholder:text-slate-400"
                                         placeholder="john.doe@mvportal.com"
                                         required
                                     />
                                 </div>
                             </div>
         
                             <div className="space-y-2">
                                 <div className="flex justify-between ml-1">
                                     <label className="text-sm font-semibold text-slate-700">Password</label>
                                     <button 
                                         onClick={handleForgotPassword}
                                         disabled={isResetting}
                                         type="button" 
                                         className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                     >
                                         {isResetting && <Loader2 className="w-3 h-3 animate-spin" />}
                                         Forgot password?
                                     </button>
                                 </div>
                                 <div className="relative group">
                                     <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                     <input
                                         name="password"
                                         type="password"
                                         value={password}
                                         onChange={(e) => setPassword(e.target.value)}
                                         className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium text-slate-800"
                                         placeholder="••••••••"
                                         required
                                     />
                                 </div>
                             </div>
         
                             <button
                                 type="submit"
                                 disabled={pending}
                                 className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                             >
                                 {pending ? (
                                     <Loader2 className="w-5 h-5 animate-spin" />
                                 ) : (
                                     <>Sign In <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
                                 )}
                             </button>
                             
                             <p className="text-center text-sm text-slate-500 mt-6">
                                 Protected by <span className="font-semibold text-slate-700"><ShieldIcon className="inline w-3 h-3 mb-0.5" /> Enterprise Security</span>
                             </p>
                        </>
                    )}
                </form>
            </div>
            
            <p className="text-center text-slate-400 text-sm mt-8">
                &copy; {new Date().getFullYear()} MV Portal. All rights reserved.
            </p>
         </motion.div>
      </div>
    </div>
  )
}

function ShieldIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    )
}
