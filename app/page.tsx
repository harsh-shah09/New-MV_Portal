
"use client"

import React, { useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, useScroll, useTransform } from 'framer-motion'
import { 
  Users, 
  BookOpen, 
  CalendarDays, 
  FileCheck, 
  Calendar, 
  Tag, 
  Banknote, 
  Bell, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  BarChart3, 
  Globe2 
} from 'lucide-react'

// --- Headless Components & Sections ---

const FadeIn = ({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 0.6, delay, ease: "easeOut" }}
    className={className}
  >
    {children}
  </motion.div>
)

export default function LandingPage() {
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 150]);

  return (
    <div className="min-h-screen bg-background overflow-hidden font-sans text-foreground selection:bg-cyan-500/30">
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10 bg-white/5 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
                 <Image src="/mv_logo.png" alt="Logo" width={50} height={50} className="w-10 h-10 object-contain drop-shadow-sm" />
                 <span className="text-xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">Portal</span>
            </Link>
            <div className="hidden md:flex gap-8">
               <a href="#features" className="text-sm font-medium hover:text-cyan-600 transition">Features</a>
               <a href="#solution" className="text-sm font-medium hover:text-cyan-600 transition">Solutions</a>
               <a href="#pricing" className="text-sm font-medium hover:text-cyan-600 transition">Pricing</a>
            </div>
            <div className="flex gap-4">
              <Link href="/auth/login" className="px-5 py-2.5 text-sm font-semibold rounded-full border border-gray-200 hover:bg-gray-50 transition">
                Sign In
              </Link>
              <Link href="/dashboard" className="px-5 py-2.5 text-sm font-semibold rounded-full btn-gradient shadow-lg hover:shadow-cyan-500/30 transition transform hover:-translate-y-0.5">
                Get Started
              </Link>
            </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-cyan-500/20 rounded-full blur-[120px] -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <FadeIn>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 text-cyan-700 text-sm font-medium mb-8 border border-cyan-500/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
                Modern HR Operations, Automated and Elevated.
              </div>
            </FadeIn>
            
            <FadeIn delay={0.1}>
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight">
                Your HR Deserves <br/>
                <span className="text-gradient">Superpowers.</span>
              </h1>
            </FadeIn>

            <FadeIn delay={0.2}>
              <p className="text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed">
                A unified HRMS built for Employee Management, Payroll, Leaves, Assets, Training, and Compliance—powered by automation and intelligent workflows.
              </p>
            </FadeIn>

            <FadeIn delay={0.3}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                 <button className="px-8 py-4 rounded-full text-lg font-bold btn-gradient shadow-xl hover:shadow-2xl transition transform hover:-translate-y-1 w-full sm:w-auto">
                    Get Started Now
                 </button>
                 <button className="px-8 py-4 rounded-full text-lg font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition w-full sm:w-auto">
                    Book a Demo
                 </button>
              </div>
            </FadeIn>
            
             <FadeIn delay={0.5} className="mt-16 relative">
                 <motion.div style={{ y: heroY }} className="relative z-10 glass-card rounded-2xl p-1 border border-white/40 shadow-2xl mx-auto max-w-5xl overflow-hidden aspect-video bg-slate-100">
                     <div className="absolute inset-0 bg-slate-50 flex font-sans text-left">
                        {/* Mock Sidebar */}
                        <div className="hidden md:flex flex-col w-56 bg-slate-900 text-slate-400 p-4 gap-4 border-r border-slate-800">
                             <div className="flex items-center gap-2 text-white font-bold mb-4">
                                 <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                                     <Zap className="w-5 h-5 text-white" />
                                 </div>
                                 Portal
                             </div>
                             <div className="space-y-1">
                                 <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-cyan-500/10 text-cyan-400 font-medium">
                                     <BarChart3 className="w-4 h-4" /> Dashboard
                                 </div>
                                 <div className="flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded-lg transition">
                                     <Users className="w-4 h-4" /> Employees
                                 </div>
                                 <div className="flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded-lg transition">
                                     <CalendarDays className="w-4 h-4" /> Leaves
                                 </div>
                                 <div className="flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded-lg transition">
                                     <Banknote className="w-4 h-4" /> Payroll
                                 </div>
                             </div>
                        </div>

                        {/* Mock Main Content */}
                        <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
                            {/* Mock Header */}
                            <div className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6">
                                <span className="font-bold text-slate-700">Dashboard Overview</span>
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                        <Bell className="w-4 h-4 text-slate-500" />
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"></div>
                                </div>
                            </div>

                            {/* Mock Dashboard Grid */}
                            <div className="p-6 gap-6 flex flex-col h-full overflow-hidden">
                                {/* KPIs */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                     {[
                                         { label: "Total Staff", val: "245", color: "bg-blue-50 text-blue-600", icon: Users },
                                         { label: "On Leave", val: "12", color: "bg-amber-50 text-amber-600", icon: Calendar },
                                         { label: "Pending", val: "8", color: "bg-red-50 text-red-600", icon: Bell },
                                         { label: "Training", val: "94%", color: "bg-green-50 text-green-600", icon: CheckCircle2 }
                                     ].map((k, i) => (
                                         <div key={i} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
                                             <div className="flex justify-between items-start mb-2">
                                                 <span className="text-xs font-medium text-slate-500">{k.label}</span>
                                                 <div className={`p-1.5 rounded-md ${k.color}`}>
                                                     <k.icon className="w-3.5 h-3.5" />
                                                 </div>
                                             </div>
                                             <span className="text-2xl font-bold text-slate-800">{k.val}</span>
                                         </div>
                                     ))}
                                </div>

                                {/* Charts Area */}
                                <div className="flex-1 grid grid-cols-3 gap-4 min-h-0">
                                     {/* Main Graph Mock */}
                                     <div className="col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-col">
                                         <div className="flex justify-between items-center mb-4">
                                             <span className="font-bold text-slate-700 text-sm">Employee Growth</span>
                                             <div className="flex gap-2">
                                                 <div className="h-2 w-2 rounded-full bg-cyan-500"></div>
                                                 <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                                             </div>
                                         </div>
                                         <div className="flex-1 flex items-end justify-between gap-2 px-2 pb-2">
                                             {[30, 45, 35, 60, 55, 75, 60, 80, 70, 90].map((h, i) => (
                                                 <div key={i} className="w-full bg-gradient-to-t from-cyan-100 to-blue-100 rounded-t-sm relative group">
                                                     <div 
                                                         style={{ height: `${h}%` }} 
                                                         className="absolute bottom-0 w-full bg-gradient-to-t from-cyan-500 to-blue-600 rounded-t-sm transition-all duration-1000 group-hover:opacity-90"
                                                     />
                                                 </div>
                                             ))}
                                         </div>
                                     </div>
                                     
                                     {/* Side Stats Mock */}
                                     <div className="col-span-1 bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-col gap-3">
                                          <span className="font-bold text-slate-700 text-sm">Activity</span>
                                          {[1, 2, 3].map((_, i) => (
                                              <div key={i} className="flex gap-3 items-start">
                                                  <div className="mt-1 h-2 w-2 rounded-full bg-slate-300 shrink-0" />
                                                  <div className="space-y-1">
                                                      <div className="h-2 w-20 bg-slate-200 rounded"></div>
                                                      <div className="h-2 w-12 bg-slate-100 rounded"></div>
                                                  </div>
                                              </div>
                                          ))}
                                     </div>
                                </div>
                            </div>
                        </div>
                     </div>
                 </motion.div>
             </FadeIn>
             
             <div className="mt-12 flex flex-wrap justify-center gap-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                {['Google', 'Microsoft', 'Spotify', 'Amazon'].map(brand => (
                    <span key={brand} className="text-xl font-bold text-slate-400">{brand}</span>
                ))}
             </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-24 bg-slate-50 relative overflow-hidden">
         <div className="max-w-4xl mx-auto px-4 text-center">
             <h2 className="text-3xl font-bold mb-12">HR Workflows Are Broken.</h2>
             <div className="grid md:grid-cols-2 gap-8 text-left">
                {[
                  "Manual employee data handling mistakes", 
                  "Slow leave approvals killing morale",
                  "Disconnected payroll systems & delays", 
                  "Training documents scattered everywhere",
                  "No visibility into asset lifecycle",
                  "Compliance tracking is a nightmare"
                ].map((item, i) => (
                    <FadeIn key={i} delay={i * 0.1}>
                        <div className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                            <div className="h-2 w-2 rounded-full bg-red-400" />
                            <span className="font-medium text-slate-700">{item}</span>
                        </div>
                    </FadeIn>
                ))}
             </div>
             <p className="mt-12 text-2xl font-serif italic text-slate-500">“Your HR deserves better.”</p>
         </div>
      </section>

      {/* Solution Overview */}
      <section id="solution" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Everything Your HR Team Needs</h2>
              <p className="text-xl text-slate-600">All modules, one modern platform.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                  { title: "Employee Management", icon: Users, desc: "Complete employee lifecycle records." },
                  { title: "Training & Handbook", icon: BookOpen, desc: "Centralized learning experience." },
                  { title: "Leave Management", icon: CalendarDays, desc: "Automated leave rules & TL approval." },
                  { title: "NDA & Compliance", icon: FileCheck, desc: "Easy e-sign + secure storage." },
                  { title: "Asset Management", icon: Tag, desc: "Track allocation, health, and lifecycle." },
                  { title: "Payroll Engine", icon: Banknote, desc: "Salary rules, deductions, exports." },
                  { title: "Notifications Hub", icon: Bell, desc: "WhatsApp, Email, In-App alerts." },
                  { title: "Holiday Calendar", icon: Calendar, desc: "Salesforce-synced smart calendar." },
              ].map((feature, i) => (
                  <FadeIn key={i} delay={i * 0.05}>
                      <div className="group p-8 rounded-3xl bg-white border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-cyan-500/10 hover:border-cyan-200 transition-all duration-300">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center text-cyan-600 mb-6 group-hover:scale-110 transition-transform">
                              <feature.icon className="w-6 h-6" />
                          </div>
                          <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                          <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
                      </div>
                  </FadeIn>
              ))}
          </div>
      </section>

      {/* Deep Dive Feature Highlight (Alternating) */}
      <section id="features" className="py-24 bg-slate-50 space-y-24">
          {[
              { 
                  title: "A 360° view of every employee.", 
                  desc: "Personal profile, bank info, documents, employment status, audit logs—all in one secure place.",
                  icon: Users,
                  image: "/placeholder-employee.png"
              },
              { 
                  title: "Payroll designed for precision.", 
                  desc: "Automated salary breakdowns, leave deductions, bonuses, and one-click export files. Never miss a payday.",
                  icon: Banknote,
                  image: "/placeholder-payroll.png",
                  reverse: true
              },
          ].map((item, i) => (
             <div key={i} className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center gap-16">
                 <div className={`flex-1 ${item.reverse ? 'md:order-2' : ''}`}>
                     <FadeIn>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold mb-4 uppercase tracking-wider">
                            <item.icon className="w-3 h-3"/> Feature Focus
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold mb-6">{item.title}</h2>
                        <p className="text-xl text-slate-600 mb-8">{item.desc}</p>
                        <button className="text-cyan-600 font-bold hover:underline underline-offset-4 decoration-2">Learn more &rarr;</button>
                     </FadeIn>
                 </div>
                 <div className={`flex-1 ${item.reverse ? 'md:order-1' : ''}`}>
                     <FadeIn delay={0.2}>
                         <div className="glass-card p-6 rounded-2xl aspect-[4/3] flex items-center justify-center bg-gradient-to-tr from-cyan-50 to-blue-50 relative overflow-hidden">
                             <div className="absolute inset-0 bg-grid-slate-200/50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]"></div>
                             {/* Abstract UI Representation */}
                             <div className="w-3/4 h-3/4 bg-white rounded-xl shadow-2xl border border-slate-100 p-4 space-y-3 z-10">
                                 <div className="h-4 w-1/3 bg-slate-200 rounded animate-pulse"/>
                                 <div className="h-32 bg-slate-100 rounded-lg"/>
                                 <div className="flex gap-2">
                                     <div className="h-8 flex-1 bg-cyan-100 rounded"/>
                                     <div className="h-8 flex-1 bg-blue-100 rounded"/>
                                 </div>
                             </div>
                         </div>
                     </FadeIn>
                 </div>
             </div>
          ))}
      </section>

      {/* Why Choose Us */}
      <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
         <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 bg-repeat mix-blend-overlay"></div>
         <div className="max-w-7xl mx-auto px-4 relative z-10">
              <h2 className="text-4xl font-bold text-center mb-16">Built for Modern HR Teams.</h2>
              <div className="grid md:grid-cols-3 gap-12">
                  {[
                      { title: "Lightning-fast Next.js", desc: "Experience zero lag with our optimized architecture." },
                      { title: "Enterprise Security", desc: "Role-Based Access + Audit Logs to keep data safe." },
                      { title: "Scalable Infrastructure", desc: "Grows with your startup to enterprise levels." }
                  ].map((item, i) => (
                      <div key={i} className="text-center">
                          <div className="mx-auto w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-6 backdrop-blur-sm border border-white/20">
                              <Zap className="w-8 h-8 text-cyan-400" />
                          </div>
                          <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                          <p className="text-slate-400">{item.desc}</p>
                      </div>
                  ))}
              </div>
         </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-4">Simple, Transparent Pricing.</h2>
          <p className="text-slate-600 text-center mb-16">Choose the plan that fits your team size.</p>
          
          <div className="grid md:grid-cols-3 gap-8">
              {[
                  { name: "Starter", price: "$0", desc: "For small teams just getting started.", features: ["Up to 10 Employees", "Basic Leave Management", "Document Storage"] },
                  { name: "Growth", price: "$49", desc: "For scaling companies.", features: ["Up to 50 Employees", "Advanced Payroll", "Full Asset Management", "Priority Support"], featured: true },
                  { name: "Enterprise", price: "Custom", desc: "For large organizations.", features: ["Unlimited Employees", "Custom Integrations", "Dedicated Account Manager", "SLA Support"] }
              ].map((plan, i) => (
                  <div key={i} className={`relative p-8 rounded-3xl border ${plan.featured ? 'border-cyan-500 shadow-2xl scale-105 z-10 bg-white' : 'border-slate-200 bg-slate-50'} flex flex-col`}>
                      {plan.featured && <div className="absolute top-0 right-0 bg-cyan-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl">POPULAR</div>}
                      <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                      <div className="text-4xl font-extrabold mb-4">{plan.price}<span className="text-lg font-normal text-slate-500">/mo</span></div>
                      <p className="text-slate-500 mb-8">{plan.desc}</p>
                      <ul className="space-y-4 mb-8 flex-1">
                          {plan.features.map((f, j) => (
                              <li key={j} className="flex items-center gap-2">
                                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                                  <span className="text-sm font-medium">{f}</span>
                              </li>
                          ))}
                      </ul>
                      <button className={`w-full py-3 rounded-xl font-bold transition ${plan.featured ? 'btn-gradient' : 'bg-white border border-slate-300 hover:bg-slate-50'}`}>
                          {plan.price === 'Custom' ? 'Talk to Sales' : 'Start Free Trial'}
                      </button>
                  </div>
              ))}
          </div>
      </section>
      
      {/* FAQ */}
      <section className="py-24 bg-slate-50">
          <div className="max-w-3xl mx-auto px-4">
              <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
              <div className="space-y-4">
                  {[
                      { q: "How does leave approval work?", a: "Employees request leave, TLs get notified via email/app, and can approve in one click." },
                      { q: "Can the system integrate with Salesforce?", a: "Yes, our Holiday and Event calendars sync bi-directionally with Salesforce." },
                      { q: "Are WhatsApp notifications supported?", a: "Absolutely. We support WhatsApp, Email, and In-App notifications." },
                      { q: "How secure is employee data?", a: "We use bank-grade encryption and strict role-based access controls." }
                  ].map((faq, i) => (
                      <details key={i} className="group p-6 bg-white rounded-xl shadow-sm border border-slate-200 cursor-pointer open:ring-1 open:ring-cyan-500">
                          <summary className="flex justify-between items-center font-bold text-lg list-none">
                              {faq.q}
                              <span className="transition group-open:rotate-180">▼</span>
                          </summary>
                          <p className="mt-4 text-slate-600 leading-relaxed">{faq.a}</p>
                      </details>
                  ))}
              </div>
          </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 text-center px-4">
          <FadeIn>
              <h2 className="text-5xl font-extrabold mb-6">Start Transforming Your HR Today.</h2>
              <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto">Automate HR workflows and focus on what really matters—your people.</p>
              <div className="flex gap-4 justify-center">
                  <Link href="/auth/signup" className="px-8 py-4 rounded-full text-lg font-bold btn-gradient shadow-xl hover:shadow-cyan-500/40 hover:-translate-y-1 transition">
                      Get Started Free
                  </Link>
                  <Link href="/contact" className="px-8 py-4 rounded-full text-lg font-bold bg-white border border-slate-200 shadow-sm hover:shadow-md hover:bg-slate-50 transition">
                      Talk to Sales
                  </Link>
              </div>
          </FadeIn>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-16 border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-12 text-sm">
              <div>
                  <div className="flex items-center gap-2 mb-6">
                      <Image src="/mv_logo.png" width={40} height={40} alt="Logo" className="grayscale opacity-70" />
                      <span className="text-white font-bold text-lg">Portal</span>
                  </div>
                  <p>Modern HR for modern teams.</p>
              </div>
              <div>
                  <h4 className="text-white font-bold mb-4">Product</h4>
                  <ul className="space-y-2">
                      <li><a href="#" className="hover:text-cyan-400">Features</a></li>
                      <li><a href="#" className="hover:text-cyan-400">Pricing</a></li>
                      <li><a href="#" className="hover:text-cyan-400">Integrations</a></li>
                  </ul>
              </div>
              <div>
                  <h4 className="text-white font-bold mb-4">Company</h4>
                  <ul className="space-y-2">
                      <li><a href="#" className="hover:text-cyan-400">About</a></li>
                      <li><a href="#" className="hover:text-cyan-400">Careers</a></li>
                      <li><a href="#" className="hover:text-cyan-400">Contact</a></li>
                  </ul>
              </div>
              <div>
                  <h4 className="text-white font-bold mb-4">Legal</h4>
                  <ul className="space-y-2">
                      <li><a href="#" className="hover:text-cyan-400">Privacy Policy</a></li>
                      <li><a href="#" className="hover:text-cyan-400">Terms of Service</a></li>
                  </ul>
              </div>
          </div>
          <div className="max-w-7xl mx-auto px-4 mt-16 pt-8 border-t border-slate-800 text-center">
              &copy; {new Date().getFullYear()} MV Portal. All rights reserved.
          </div>
      </footer>
    
    {/* SEO Content (Hidden visually but present for crawlers if needed, or structured below) */}
    <section className="sr-only">
        <h2>HRMS Automation and Payroll Integration</h2>
        <p>
            Modern HR management requires a seamless integration of payroll, leave tracking, and asset management. 
            Our advanced HRMS solution provides centralized training modules to empower your workforce. 
            With automated leave management, teams can focus on productivity rather than paperwork.
            Asset lifecycle management ensures efficient resource utilization from day one to retirement.
        </p>
    </section>

    </div>
  )
}
