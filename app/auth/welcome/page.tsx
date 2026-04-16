
"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { message } from "antd"
import Link from "next/link"

import { useRef } from "react"

function WelcomeContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const id = searchParams.get("id")
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const hasRun = useRef(false)

    useEffect(() => {
        if (!id) {
            setError(true)
            setLoading(false)
            return
        }

        if (hasRun.current) return;
        hasRun.current = true;

        // Verify and track first time login
        const initWelcome = async () => {
            try {
                // Call API to set first_time_login = true in DynamoDB
                // This marks that the user has clicked the link
                const res = await fetch('/api/auth/track-welcome', {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({ employeeId: id })
                })
                
                if (res.ok) {
                    message.success("Verified! Please set your password.")
                    // Redirect to password setup/reset page
                    // We might pass the ID or a token? 
                    // Assuming /auth/reset-password handles logic or we use a localized set-password component
                    // For now, let's redirect to reset-password with ID.
                    router.push(`/auth/reset-password?id=${id}`) // Or appropriate reset flow
                } else {
                    throw new Error("Failed to verify")
                }
            } catch (err) {
                console.error(err)
                setError(true)
                message.error("Invalid or expired welcome link")
            } finally {
                setLoading(false)
            }
        }

        initWelcome()
    }, [id, router])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <h2 className="text-xl font-semibold text-gray-700">Verifying your account...</h2>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                 <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-lg text-center">
                    <div className="text-red-500 text-5xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Link Expired or Invalid</h2>
                    <p className="text-gray-500 mb-6">We couldn't verify your welcome link. It may have expired or is invalid.</p>
                    <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 font-medium">
                        Go to Login
                    </Link>
                 </div>
            </div>
        )
    }

    return null // Redirecting...
}

export default function WelcomePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <WelcomeContent />
        </Suspense>
    )
}
