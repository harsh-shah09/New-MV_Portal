"use client"

import { useActionState } from "react"
import { loginAction } from "./actions"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { motion } from "framer-motion"
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react"

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, {})
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  useEffect(() => {
    if (state.success) {
      router.push("/dashboard")
    }
  }, [state.success, router])

  return (
    <div className="min-h-screen w-full flex overflow-hidden bg-slate-50">
      {/* Left Side - Visual Showcase */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden items-center justify-center">
        <div className="absolute inset-0 z-0">
             <div className="absolute top-0 -left-1/4 w-full h-full bg-gradient-to-br from-cyan-500/30 to-blue-600/30 blur-[150px] animate-pulse" style={{ animationDuration: '10s' }} />
             <div className="absolute bottom-0 -right-1/4 w-full h-full bg-gradient-to-tl from-purple-500/30 to-indigo-600/30 blur-[150px] animate-pulse" style={{ animationDuration: '8s' }} />
             <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
        </div>

        <div className="relative z-10 p-12 text-white max-w-xl">
             <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
             >
                <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-8 border border-white/20 shadow-xl">
                    <Image src="/mv_logo.png" alt="MV Portal Logo" width={40} height={40} className="object-contain" />
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
                        <Image src="/mv_logo.png" alt="Logo" width={40} height={40} />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-800 mb-2">Sign In</h2>
                    <p className="text-slate-500">Access your employee dashboard</p>
                </div>

                <form action={action} className="space-y-6">
                    {state.error && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
                        >
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"/></svg>
                            {state.error}
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
                            <a href="#" className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline">Forgot password?</a>
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
