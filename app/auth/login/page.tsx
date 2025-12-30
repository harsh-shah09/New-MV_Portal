"use client"

import { useActionState } from "react"
import { loginAction } from "./actions"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, {})
  const router = useRouter()

  useEffect(() => {
    if (state.success) {
      router.push("/dashboard")
    }
  }, [state.success, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">HR Portal</h1>
            <p className="text-gray-600">Employee Management System</p>
          </div>

          <form action={action} className="space-y-4">
            {state.error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{state.error}</div>
            )}

            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address or Employee ID
              </label>
              <input
                id="identifier"
                name="identifier" // Matches formData.get('identifier')
                type="text"
                placeholder="Enter email or employee ID"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                required
              />
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg transition duration-200 cursor-pointer disabled:cursor-not-allowed"
            >
              {pending ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            {/* <p>Protected by HRMS Security</p> */}
          </div>
        </div>
      </div>
    </div>
  )
}

