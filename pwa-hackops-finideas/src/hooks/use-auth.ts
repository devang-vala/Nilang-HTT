'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// Query keys
export const authKeys = {
  all: ['auth'] as const,
  user: () => [...authKeys.all, 'user'] as const,
}

interface PayloadUser {
  id: string
  email: string
  name: string
  role: string
  createdAt: string
}

interface LoginCredentials {
  email: string
  password: string
}

interface RegisterData {
  name: string
  email: string
  password: string
}

interface ForgotPasswordData {
  email: string
}

interface ResetPasswordData {
  token: string
  password: string
}

// Login mutation — uses Payload's built-in /api/users/login
export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ email, password }: LoginCredentials) => {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.errors?.[0]?.message || 'Invalid email or password')
      }
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.setQueryData(authKeys.user(), data.user)
    },
  })
}

// Register mutation — NOW uses our custom /api/register endpoint
export function useRegister() {
  return useMutation({
    mutationFn: async ({ name, email, password }: RegisterData) => {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, password }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(
          error.errors?.[0]?.message || 'Registration failed'
        )
      }
      return res.json()
    },
  })
}

// Forgot password mutation — uses Payload's built-in /api/users/forgot-password
export function useForgotPassword() {
  return useMutation({
    mutationFn: async ({ email }: ForgotPasswordData) => {
      const res = await fetch('/api/users/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.errors?.[0]?.message || 'Failed to send reset email')
      }
      return res.json()
    },
  })
}

// Reset password mutation — uses Payload's built-in /api/users/reset-password
export function useResetPassword() {
  return useMutation({
    mutationFn: async ({ token, password }: ResetPasswordData) => {
      const res = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, password }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.errors?.[0]?.message || 'Failed to reset password')
      }
      return res.json()
    },
  })
}

// Get current user — uses Payload's built-in /api/users/me
export function useCurrentUser() {
  return useQuery<PayloadUser | null>({
    queryKey: authKeys.user(),
    queryFn: async () => {
      const res = await fetch('/api/users/me', {
        credentials: 'include',
      })
      if (!res.ok) return null
      const data = await res.json()
      return data.user || null
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
}

// Logout — uses Payload's built-in /api/users/logout
export function useLogout() {
  const queryClient = useQueryClient()

  return () => {
    fetch('/api/users/logout', {
      method: 'POST',
      credentials: 'include',
    }).then(() => {
      queryClient.setQueryData(authKeys.user(), null)
      queryClient.clear()
    })
  }
}