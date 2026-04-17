"use client"

import { useSearchParams } from "next/navigation"
import { OnboardingWizard } from "@/components/onboarding-wizard"
import { Suspense, useEffect, useState } from "react"
import { Loader2, AlertCircle } from "lucide-react"

function WelcomeContent() {
    const searchParams = useSearchParams()
    const id = searchParams.get('id')
    const token = searchParams.get('token')
    const [firsttime , setFirsttime] = useState(false)
    const [isExpired, setIsExpired] = useState(false)
    const [isValidating, setIsValidating] = useState(true)
    const [step , setStep] = useState(1);
    useEffect(() => {
        console.log(id , token)
        if (!id || !token) {
            setIsExpired(true)
            console.log('here')
            setIsValidating(false)
            return
        }

        try {
            const decodedStr = atob(token)
            const decoded = JSON.parse(decodedStr)
            console.log( decoded)
            setFirsttime(decoded.firsttime)
            setStep(decoded.step ?? step)
            if (decoded.expirationtime && decoded.expirationtime < Date.now()) {
                setIsExpired(true)
            }
        } catch (e) {
            setIsExpired(true)
            console.log(e)
        }
        
        setIsValidating(false)
    }, [id, token])

    if (isValidating) {
        return (
            <div className="min-h-screen bg-slate-50 flex justify-center items-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        )
    }

    if (isExpired || !id) {
        return (
             <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                 <div className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-lg w-full p-10 text-center">
                     <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-6" />
                     <h2 className="text-2xl font-bold text-slate-800 mb-4">Link Expired</h2>
                     <p className="text-slate-500 mt-2">This onboarding link is no longer valid or has expired.</p>
                 </div>
             </div>
        )
    }

    return <OnboardingWizard publicMode={true} publicEmpId={id} firsttime={firsttime} step = {step}/>
}

export default function WelcomePage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-50 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>}>
            <WelcomeContent />
        </Suspense>
    )
}
