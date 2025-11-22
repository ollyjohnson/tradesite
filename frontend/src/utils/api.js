import { useAuth } from "@clerk/clerk-react"

export const useApi = () => {
  const { getToken } = useAuth()

  const makeRequest = async (endpoint, options = {}) => {
    const token = await getToken()

    const isFormData = options.body instanceof FormData

    const headers = {
      Authorization: `Bearer ${token}`,
      // Only set JSON header if not sending FormData
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    }

    const response = await fetch(`http://localhost:8000/api/${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      // try to parse error as JSON, otherwise null
      const errorData = await response.json().catch(() => null)
      if (response.status === 429) {
        throw new Error("Daily quota exceeded")
      }
      throw new Error(errorData?.detail || "An error occurred")
    }

    // try JSON first, fall back to text if needed
    const contentType = response.headers.get("content-type") || ""
    if (contentType.includes("application/json")) {
      return response.json()
    }
    return response.text()
  }

  return { makeRequest }
}

export const useAlpha = () => {
  const { getToken } = useAuth()

  const makeRequest = async (endpoint, options = {}) => {
    const token = await getToken()

    const isFormData = options.body instanceof FormData

    const headers = {
      Authorization: `Bearer ${token}`,
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    }

    const response = await fetch(`http://localhost:8000/alpha/${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      if (response.status === 429) {
        throw new Error("Daily quota exceeded")
      }
      throw new Error(errorData?.detail || "An error occurred")
    }

    const contentType = response.headers.get("content-type") || ""
    if (contentType.includes("application/json")) {
      return response.json()
    }
    return response.text()
  }

  return { makeRequest }
}
