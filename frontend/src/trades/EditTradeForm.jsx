import { useState, useEffect } from "react"
import { useApi } from "../utils/api"
import { useNavigate , useParams}  from "react-router-dom"
import { TradeForm } from "./TradeForm"

export function EditTradeForm() {
  const { makeRequest } = useApi()
  const navigate = useNavigate()
  const { tradeId } = useParams()

  const [initialData, setInitialData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchTrade()
  }, [])

  const fetchTrade = async () => {
    try {
      const data = await makeRequest(`trades/${tradeId}`)
      setInitialData(data.trade)
    } catch (err) {
      setError("Failed to load trade.")
    } finally {
      setLoading(false)
    }
  }
  
    const handleSubmit = async (formData) => {
      try {
        await makeRequest(`trades/${tradeId}`, {
          method: "PUT",
          body: JSON.stringify(formData),
        })
        navigate("/my-trades")
      } catch (err){
        console.error("Failed to update trade:", err)
      }
    }

  if (loading) return <p className="text-white text-center mt-8">Loading trade data...</p>
  if (error) return <p className="text-red-400 text-center mt-8">{error}</p>

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-white/5 backdrop-blur-lg shadow-lg rounded-xl text-white">
      <h2 className="text-2xl font-semibold text-pink-400 mb-6">Edit Trade</h2>
      <TradeForm initialData={initialData} onSubmit={handleSubmit} />
    </div>
  )
}