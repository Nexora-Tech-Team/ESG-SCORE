import axios, { type AxiosError } from 'axios'
import type { ApiError } from '@/types'

export const api = axios.create({
  baseURL: `${import.meta.env.BASE_URL}api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

// attach token dari localStorage setiap request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

// handle 401 → clear ALL session state → redirect login (avoid half-state loops)
api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError<ApiError>) => {
    if (err.response?.status === 401) {
      // Clear both the raw token and the persisted zustand auth store so a stale
      // user/token can't linger and bounce the app back to /login repeatedly.
      localStorage.removeItem('access_token')
      localStorage.removeItem('esg-score-auth')
      // Don't redirect if the failing request was the login attempt itself, or if
      // we're already on the login page (prevents redirect loops).
      const url = err.config?.url ?? ''
      const isAuthCall = url.includes('/auth/login')
      if (!isAuthCall && window.location.pathname !== '/login') {
        window.location.href = `${import.meta.env.BASE_URL}login`
      }
    }
    return Promise.reject(err)
  },
)

export function getErrorMessage(err: unknown): string {
  const axiosErr = err as AxiosError<ApiError>
  return axiosErr.response?.data?.message ?? axiosErr.response?.data?.error ?? 'Terjadi kesalahan. Coba lagi.'
}
