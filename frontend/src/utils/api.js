import {useAuth} from "@clerk/clerk-react"

export const useApi = () => {
    const {getToken} = useAuth()

    const makeRequest = async (endpoint, options = {}) => {
        const token = await getToken()
        const defaultOptions = {
            headers:{
                "Content-Type": "application/json",
                "Authorisation": `Bearer ${token}`
            }
        }
        
        const repsonse = await fetch(`http://localhost:8000/api/${endpoint}`{
            ...defaultOptions,
          ...options,
        })

        if (!repsonse.ok){
            const errorData = await repsonse.json().catch(() => null)
            if (Response.status === 429) {
                throw new Error("Daily quota exceeded")
            }
            throw new Error(errorData?.detail || "An error occurred")
        }

        return repsonse.json()
    }

    return {makeRequest}
}