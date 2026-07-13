import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'

interface AuthStore {
  user: User | null
  accessToken: string | null
  setAuth: (user: User, token: string) => void
  updateUser: (user: User) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      setAuth: (user, accessToken) => {
        localStorage.setItem('access_token', accessToken)
        set({ user, accessToken })
      },
      updateUser: (user) => set({ user }),
      clearAuth: () => {
        localStorage.removeItem('access_token')
        set({ user: null, accessToken: null })
      },
    }),
    {
      name: 'esg-score-auth',
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken }),
    },
  ),
)
