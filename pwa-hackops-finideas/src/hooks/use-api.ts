'use client'

import { useQuery, useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'

/**
 * Generic GET hook using Payload's REST API
 */
export function useGet<T = unknown>(
  key: QueryKey,
  url: string,
  options: Record<string, unknown> = {}
) {
  return useQuery<T>({
    queryKey: Array.isArray(key) ? key : [key],
    queryFn: async () => {
      const res = await fetch(url, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
    ...options,
  })
}

/**
 * Generic POST hook
 */
export function usePost<TData = unknown, TVariables = unknown>(
  url: string,
  options: Record<string, unknown> & { invalidateKeys?: QueryKey[] } = {}
) {
  const queryClient = useQueryClient()

  return useMutation<TData, Error, TVariables>({
    mutationFn: async (body) => {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Request failed')
      return res.json()
    },
    ...options,
    onSuccess: (data, variables, context) => {
      if (options.invalidateKeys) {
        options.invalidateKeys.forEach((key) => {
          queryClient.invalidateQueries({
            queryKey: Array.isArray(key) ? key : [key],
          })
        })
      }
      if (typeof options.onSuccess === 'function') {
        ;(options.onSuccess as (data: TData, variables: TVariables, context: unknown) => void)(data, variables, context)
      }
    },
  })
}

/**
 * Generic PUT/PATCH hook
 */
export function usePut<TData = unknown, TVariables = unknown>(
  url: string,
  options: Record<string, unknown> & { invalidateKeys?: QueryKey[] } = {}
) {
  const queryClient = useQueryClient()

  return useMutation<TData, Error, TVariables>({
    mutationFn: async (body) => {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Request failed')
      return res.json()
    },
    ...options,
    onSuccess: (data, variables, context) => {
      if (options.invalidateKeys) {
        options.invalidateKeys.forEach((key) => {
          queryClient.invalidateQueries({
            queryKey: Array.isArray(key) ? key : [key],
          })
        })
      }
      if (typeof options.onSuccess === 'function') {
        ;(options.onSuccess as (data: TData, variables: TVariables, context: unknown) => void)(data, variables, context)
      }
    },
  })
}

/**
 * Generic DELETE hook
 */
export function useDelete<TData = unknown>(
  url: string,
  options: Record<string, unknown> & { invalidateKeys?: QueryKey[] } = {}
) {
  const queryClient = useQueryClient()

  return useMutation<TData, Error, string>({
    mutationFn: async (id) => {
      const res = await fetch(`${url}/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Delete failed')
      return res.json()
    },
    ...options,
    onSuccess: (data, variables, context) => {
      if (options.invalidateKeys) {
        options.invalidateKeys.forEach((key) => {
          queryClient.invalidateQueries({
            queryKey: Array.isArray(key) ? key : [key],
          })
        })
      }
      if (typeof options.onSuccess === 'function') {
        ;(options.onSuccess as (data: TData, variables: string, context: unknown) => void)(data, variables, context)
      }
    },
  })
}