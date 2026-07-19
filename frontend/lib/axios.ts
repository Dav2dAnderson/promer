import axios from 'axios'

const TOKEN_STORAGE_KEY = 'promer_access_token'
let accessToken = ''

export const setToken = (t: string) => {
  accessToken = t
  if (typeof window !== 'undefined') {
    if (t) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, t)
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY)
    }
  }
}

export const getToken = () => {
  if (accessToken) {
    return accessToken
  }

  if (typeof window !== 'undefined') {
    const storedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY)
    if (storedToken) {
      accessToken = storedToken
      return accessToken
    }
  }

  return ''
}

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, clear it
      accessToken = ''
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api