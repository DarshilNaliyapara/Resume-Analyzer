// src/lib/api.ts
import axios from 'axios'

const TOKEN_KEY = 'ra_access'
const REFRESH_KEY = 'ra_refresh'

export const saveTokens = (access: string, refresh: string) => {
  localStorage.setItem(TOKEN_KEY, access)
  localStorage.setItem(REFRESH_KEY, refresh)
}

export const clearTokens = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

export const getAccessToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null
export const getRefreshToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem(REFRESH_KEY) : null

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

const api = axios.create({ baseURL: BASE })

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false
let failedQueue: Array<{ resolve: (val: any) => void; reject: (err: any) => void }> = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token))
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    // Only handle 401 and only once per request
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }

    const refresh = getRefreshToken()
    if (!refresh) {
      // No refresh token at all — must login
      clearTokens()
      window.location.href = '/login'
      return Promise.reject(error)
    }

    if (isRefreshing) {
      // Another request already refreshing — queue this one
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then(token => {
        original.headers.Authorization = `Bearer ${token}`
        return axios(original)
      })
    }

    original._retry = true
    isRefreshing = true

    try {
      const res = await axios.post(`${BASE}/auth/token/refresh/`, { refresh })
      const newAccess = res.data.access

      saveTokens(newAccess, refresh)
      api.defaults.headers.common.Authorization = `Bearer ${newAccess}`
      original.headers.Authorization = `Bearer ${newAccess}`

      processQueue(null, newAccess)
      return api(original)

    } catch (refreshError) {
      processQueue(refreshError, null)
      clearTokens()
      window.location.href = '/login'
      return Promise.reject(refreshError)

    } finally {
      isRefreshing = false
    }
  }
)

export default api