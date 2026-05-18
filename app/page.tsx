import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/auth'

export default async function LandingPage() {
  const session = await verifySession()

  if (session) {
    redirect('/dashboard')
  } else {
    redirect('/auth/login')
  }
}
