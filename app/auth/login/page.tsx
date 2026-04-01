"use client"

import { loginAction, forgotPasswordAction, verify2FAAndLogin } from "./actions"
import { useEffect, useState, useActionState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { motion } from "framer-motion"
import { Mail, Lock, ArrowRight, Loader2, CheckCircle2, Ban } from "lucide-react"

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

  return (
    <div className="min-h-screen w-full flex overflow-hidden bg-slate-50 flex-row-reverse">
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
                <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-8 border border-white/20 shadow-xl">
                    <Image src="/mv_logo1.png" alt="MV Portal Logo" width={40} height={40} className="object-contain" />
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
                        <Image src="/mv_logo1.png" alt="Logo" width={40} height={40} />
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
                                    support@mvportal.com
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
