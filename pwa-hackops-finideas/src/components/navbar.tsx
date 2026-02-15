'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCurrentUser, useLogout } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { LogOut, User, Settings, LayoutDashboard, Mic, Shield, Users } from 'lucide-react'

export default function Navbar() {
  const { data: user, isLoading: loading } = useCurrentUser()
  const logout = useLogout()
  const pathname = usePathname()

  const getInitials = (name: string | undefined) => {
    return name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Don't show navbar on auth pages
  if (
    pathname?.startsWith('/auth') ||
    pathname?.startsWith('/forgot-password') ||
    pathname?.startsWith('/reset-password')
  ) {
    return null
  }

  const handleLogout = () => {
    logout()
    window.location.href = '/auth'
  }

  return (
    <nav className="border-b mt-6 border-slate-100 bg-white/80 backdrop-blur-lg sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-7 w-7 bg-slate-900 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">F</span>
          </div>
          <span className="text-sm font-semibold text-slate-900 tracking-tight">
            Finideas Connect
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {loading ? (
            <div className="h-8 w-8 animate-pulse bg-slate-200 rounded-full" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full p-0"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-slate-900 text-white text-xs font-medium">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-md">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full w-fit mt-1 ${
                      user.role === 'admin'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {user.role === 'admin' ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
                      {user.role === 'admin' ? 'Admin' : 'User'}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="cursor-pointer">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/recorder" className="cursor-pointer">
                    <Mic className="mr-2 h-4 w-4" />
                    Voice Recorder
                  </Link>
                </DropdownMenuItem>
                {user.role === 'admin' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer">
                        <Shield className="mr-2 h-4 w-4" />
                        Admin Panel
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/collections/users" className="cursor-pointer">
                        <Users className="mr-2 h-4 w-4" />
                        Manage Users
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-red-600 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/auth">
              <Button size="sm" className="rounded-md text-xs h-8 px-4 bg-slate-900 hover:bg-slate-800">
                Login
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}