'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForgotPassword } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle, ArrowLeft, Loader2 } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const forgotPasswordMutation = useForgotPassword()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await forgotPasswordMutation.mutateAsync({ email })
      setSuccess(true)
    } catch {
      setSuccess(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 bg-foreground rounded-2xl flex items-center justify-center mb-4">
            <span className="text-background text-xl font-bold">F</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Forgot Password</h1>
          <p className="text-sm text-muted-foreground mt-1">{"We'll send you a reset link"}</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6">
          {success ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-muted rounded-xl">
                <CheckCircle className="h-5 w-5 text-foreground shrink-0 mt-0.5" />
                <p className="text-sm text-foreground leading-relaxed">
                  If an account exists with this email, you will receive a password reset link shortly.
                </p>
              </div>
              <Link href="/auth">
                <Button variant="outline" className="w-full h-11 rounded-xl border-border text-foreground hover:bg-muted">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="rounded-xl">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 rounded-xl bg-muted/50 border-border focus-visible:ring-foreground/10"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-11 rounded-xl bg-foreground text-background hover:bg-foreground/90 font-medium"
                disabled={forgotPasswordMutation.isPending}
              >
                {forgotPasswordMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
              <Link href="/auth">
                <Button variant="ghost" className="w-full h-11 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Button>
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
