import axios, { AxiosInstance } from 'axios'

export const httpClient: AxiosInstance = axios.create({
  timeout: 30000,
  headers: {
    'User-Agent': 'AudiobookshelfMetadataProvider/1.0.0',
    Accept: 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache'
  },
  validateStatus: (status) => status >= 200 && status < 500
})

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('HTTP Request Error:', error.message)
    return Promise.reject(error)
  }
)
