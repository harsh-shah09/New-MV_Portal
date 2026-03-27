"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { hasPageAccess } from "@/lib/access-control"
import { motion } from "framer-motion"
import { ShieldX, ArrowLeft, Home } from "lucide-react"
import { Spin } from "antd"

interface RoleGuardProps {
    children: React.ReactNode
    requiredRoles?: string[]
}

/**
 * Component to protect pages based on user roles
 * Shows an error page if user doesn't have access
 */
export function RoleGuard({ children, requiredRoles }: RoleGuardProps) {
    const router = useRouter()
    const pathname = usePathname()
    const [isChecking, setIsChecking] = useState(true)
    const [hasAccess, setHasAccess] = useState(false)

    const { data: user, isLoading } = useQuery({
        queryKey: ['me'],
        queryFn: async () => {
            const res = await fetch('/api/me')
            if (!res.ok) {
                if (res.status === 401) {
                    router.push('/auth/login')
                    return null
                }
                throw new Error('Failed to fetch user')
            }
            return res.json()
        }
    })

    useEffect(() => {
        if (isLoading) return

        if (!user) {
            router.push('/auth/login')
            return
        }

        const userRole = user.role || user.User_Role__c
        const access = hasPageAccess(userRole, pathname)

        setHasAccess(access)
        setIsChecking(false)
    }, [user, isLoading, pathname, router])

    // Show loading state
    if (isChecking || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Spin size="large" tip = 'Loading...'/>
            </div>
        )
    }

    // Show access denied page
    if (!hasAccess) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="max-w-md w-full"
                >
                    <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
                        <div className="flex flex-col items-center text-center">
                            {/* Icon */}
                            <div className="mb-6 relative">
                                <div className="absolute inset-0 bg-red-100 rounded-full blur-xl opacity-50"></div>
                                <div className="relative bg-red-50 p-4 rounded-full">
                                    <ShieldX className="w-16 h-16 text-red-600" />
                                </div>
                            </div>

                            {/* Title */}
                            <h1 className="text-3xl font-bold text-slate-900 mb-3">
                                Access Denied
                            </h1>

                            {/* Message */}
                            <p className="text-slate-600 mb-2">
                                You don&apos;t have permission to access this page.
                            </p>
                            <p className="text-sm text-slate-500 mb-8">
                                Your role: <span className="font-semibold text-slate-700">{user?.role || 'Employee'}</span>
                            </p>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                                <button
                                    onClick={() => router.back()}
                                    className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors duration-200 font-medium"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Go Back
                                </button>
                                <button
                                    onClick={() => router.push('/dashboard')}
                                    className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 font-medium"
                                >
                                    <Home className="w-4 h-4" />
                                    Dashboard
                                </button>
                            </div>

                            {/* Additional Info */}
                            <div className="mt-8 p-4 bg-slate-50 rounded-lg w-full">
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    If you believe you should have access to this page, please contact your HR administrator or system administrator.
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        )
    }

    // User has access, render children
    return <>{children}</>
}
