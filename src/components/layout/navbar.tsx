'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Users, Home, Settings, LogIn, LogOut } from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'

const publicNavigation = [{ name: '首页', href: '/', icon: Home }]
const protectedNavigation = [
  { name: '仪表板', href: '/dashboard', icon: LayoutDashboard },
  { name: '团队管理', href: '/teams', icon: Users },
]

export function Navbar() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const isLoggedIn = status === 'authenticated' && !!session

  const navigation = isLoggedIn ? [...publicNavigation, ...protectedNavigation] : publicNavigation

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="mr-8 flex items-center">
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Settings className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="hidden font-bold text-lg sm:inline-block">GPT 团队管理器</span>
          </Link>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline-block">{item.name}</span>
                </Link>
              )
            })}
          </div>

          {isLoggedIn ? (
            <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: '/login' })}>
              <LogOut className="mr-2 h-4 w-4" />
              退出
            </Button>
          ) : (
            <Link href="/login">
              <Button size="sm">
                <LogIn className="mr-2 h-4 w-4" />
                登录
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
