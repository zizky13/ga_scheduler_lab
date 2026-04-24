import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi, type LoginResponse } from '@/lib/api'

interface AuthUser {
  id: number
  username: string
  email: string
  role: string
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  isLoading: boolean
  error: string | null

  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,

      login: async (username, password) => {
        set({ isLoading: true, error: null })
        try {
          const data: LoginResponse = await authApi.login(username, password)
          // Persist token in localStorage for the axios interceptor
          localStorage.setItem('accessToken', data.accessToken)
          set({
            user: data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            isLoading: false,
          })
        } catch (err: unknown) {
          const msg =
            err instanceof Error ? err.message : 'Invalid username or password.'
          set({ isLoading: false, error: msg })
        }
      },

      logout: async () => {
        const { refreshToken } = get()
        try {
          if (refreshToken) await authApi.logout(refreshToken)
        } catch {
          // best-effort
        }
        localStorage.removeItem('accessToken')
        set({ user: null, accessToken: null, refreshToken: null, error: null })
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      // only persist user identity, not sensitive tokens in zustand state
      partialize: state => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
)
