import axios from 'axios'

const COOKIE_TOKEN_KEY = 'my-app-auth'
let accessToken = ''

const setCookie = (name: string, value: string) => {
  if (typeof document === 'undefined') return
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  // Use SameSite=Lax to allow top-level navigation while protecting CSRF
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; SameSite=Lax${secure}`
}

const getCookie = (name: string) => {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : ''
}

export const setToken = (t: string) => {
  accessToken = t
  if (typeof window !== 'undefined') {
    if (t) {
      setCookie(COOKIE_TOKEN_KEY, t)
    } else {
      // Remove cookie by setting past expiry
      setCookie(COOKIE_TOKEN_KEY, '')
      try {
        document.cookie = `${COOKIE_TOKEN_KEY}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
      } catch (e) {
        // ignore
      }
    }
  }
}

export const getToken = () => {
  if (accessToken) return accessToken
  if (typeof window !== 'undefined') {
    const cookieToken = getCookie(COOKIE_TOKEN_KEY)
    if (cookieToken) {
      accessToken = cookieToken
      return accessToken
    }
  }
  return ''
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, clear it
      setToken('')
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
