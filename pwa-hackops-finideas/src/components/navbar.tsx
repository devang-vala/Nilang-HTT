'use client'

import { useState } from 'react'
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
import { LogOut, User, Settings, LayoutDashboard, Mic, Shield, Users, X } from 'lucide-react'

const SYNC_BAR_HEIGHT = 40

export default function Navbar() {
  const { data: user, isLoading: loading } = useCurrentUser()
  const logout = useLogout()
  const pathname = usePathname()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const getInitials = (name: string | undefined) => {
    return name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

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

  const closeSidebar = () => setMobileSidebarOpen(false)

  const userBlock = user ? (
    <div className="flex flex-col gap-1 px-2 py-2">
      <p className="text-sm font-semibold text-foreground">{user.name}</p>
      <p className="text-xs text-muted-foreground">{user.email}</p>
      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full w-fit font-medium ${
        user.role === 'admin'
          ? 'bg-foreground text-background'
          : 'bg-muted text-muted-foreground'
      }`}>
        {user.role === 'admin' ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
        {user.role === 'admin' ? 'Admin' : 'User'}
      </span>
    </div>
  ) : null

  const dropdownContent = user ? (
    <>
      <DropdownMenuLabel className="px-0">
        {userBlock}
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link href="/dashboard" className="cursor-pointer">
          <LayoutDashboard className="mr-2 h-4 w-4" />
          Dashboard
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
        className="cursor-pointer text-destructive focus:text-destructive"
      >
        <LogOut className="mr-2 h-4 w-4" />
        Logout
      </DropdownMenuItem>
    </>
  ) : null

  const sidebarLink = (href: string, icon: React.ReactNode, label: string) => (
    <Link
      href={href}
      onClick={closeSidebar}
      className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
    >
      {icon}
      {label}
    </Link>
  )

  return (
    <>
      <nav
        className="bg-card sticky border-b border-border z-40"
        style={{ top: SYNC_BAR_HEIGHT }}
      >
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 bg-foreground rounded-xl flex items-center justify-center">
              <span className="text-background text-sm font-bold">F</span>
            </div>
            <span className="text-sm font-semibold text-foreground tracking-tight">
              Finideas
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {loading ? (
              <div className="h-9 w-9 animate-pulse bg-muted rounded-full" />
            ) : user ? (
              <>
                {/* Mobile: avatar opens left sidebar */}
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 rounded-full p-0 hover:bg-muted md:hidden"
                  onClick={() => setMobileSidebarOpen(true)}
                  aria-label="Open menu"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-foreground text-background text-xs font-semibold">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
                {/* Desktop: dropdown */}
                <div className="hidden md:block">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="relative h-9 w-9 rounded-full p-0 hover:bg-muted"
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-foreground text-background text-xs font-semibold">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 rounded-xl border-border shadow-lg">
                      {dropdownContent}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            ) : (
              <Link href="/auth">
                <Button size="sm" className="rounded-xl text-xs h-9 px-5 bg-foreground text-background hover:bg-foreground/90">
                  Login
                </Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile left sidebar */}
      {user && (
        <>
          <div
            role="presentation"
            className={`fixed inset-0 z-50 bg-black/50 transition-opacity duration-200 md:hidden ${mobileSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={closeSidebar}
            aria-hidden="true"
          />
          <aside
            className={`fixed left-0 top-0 bottom-0 z-50 w-72 max-w-[85vw] bg-card border-r border-border shadow-xl flex flex-col transition-transform duration-200 ease-out md:hidden ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
            style={{ paddingTop: SYNC_BAR_HEIGHT }}
            aria-label="Menu"
          >
            <div className="flex items-center justify-between px-4 h-14 border-b border-border shrink-0">
              <span className="text-sm font-semibold text-foreground">Menu</span>
              <button
                type="button"
                onClick={closeSidebar}
                className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-2 px-2">
              <div className="border-b border-border pb-3 mb-2">
                {userBlock}
              </div>
              <nav className="flex flex-col gap-0.5 px-2">
                {sidebarLink('/dashboard', <LayoutDashboard className="h-4 w-4 shrink-0" />, 'Dashboard')}
                {sidebarLink('/recorder', <Mic className="h-4 w-4 shrink-0" />, 'Voice Recorder')}
                {user?.role === 'admin' && (
                  <>
                    {sidebarLink('/admin', <Shield className="h-4 w-4 shrink-0" />, 'Admin Panel')}
                    {sidebarLink('/admin/collections/users', <Users className="h-4 w-4 shrink-0" />, 'Manage Users')}
                  </>
                )}
                <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground">
                  <Settings className="h-4 w-4 shrink-0" />
                  Settings
                </div>
                <button
                  type="button"
                  onClick={() => { handleLogout(); closeSidebar(); }}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors w-full text-left"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  Logout
                </button>
              </nav>
            </div>
          </aside>
        </>
      )}
    </>
  )
}
