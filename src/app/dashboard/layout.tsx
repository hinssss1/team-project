import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth()

  if (!session) {
    redirect('/login?callbackUrl=/dashboard')
  }

  return <>{children}</>
}
