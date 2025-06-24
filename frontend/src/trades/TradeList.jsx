import { useEffect, useState } from "react"
import { useApi } from "../utils/api"
import { useNavigate } from "react-router-dom"

export function TradeList() {
    const { makeRequest } = useApi()
    const [trades, setTrades] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const navigate = useNavigate()

    useEffect(() => {
        fetchTrades()
    }, [])

    const fetchTrades = async () => {
        try {
            const data = await makeRequest("trades")
            console.log("Fetched trades:", data)
            setTrades(data.trades)
        } catch(err) {
            console.error("Fetch error:", err)
            setError("Failed to load trades.")
        } finally {
            setLoading(false)
        }
    }

    const formatPnl = (pnl, status) => {
        if (status == "Open") return <span style={{color: "black"}} > Open </span>
        if (pnl > 0) return <span style={{color: "green"}} > +{pnl.toFixed(2)}</span>
        if (pnl < 0) return <span style={{color: "red"}} > {pnl.toFixed(2)}</span>
        return <span style={{color: "black" }}>0.00</span>
    }

    if (loading) return <div className="text-white text-center mt-8">Loading trades...</div>
    if (error) return <div className="text-red-400 text-center mt-8">{error}</div>

  return (
    <div className="history-panel">
      <h2 className="text-xl font-semibold text-pink-400 mb-6">Your Trades</h2>
      {trades.length === 0 ? (
        <p className="text-white/80">No trades yet.</p>
      ) : (
        <div className="history-list">
          {trades.map((trade) => (
            <div
              className="history-item flex flex-col gap-2"
              key={trade.id}
            >
              <strong className="text-white text-lg font-bold">
                {trade.ticker}
              </strong>
              <p className="text-white/80">{trade.mistake}</p>
              <em className="text-white/80 italic">{trade.notes}</em>
              <p className="text-white/80">Status: {trade.status}</p>
              <p className="text-white/80">
                Profit/Loss: {formatPnl(trade.pnl, trade.status)}
              </p>
              <button
                className="self-start mt-2 bg-pink-600 hover:bg-pink-500 text-white px-3 py-1 rounded-md text-sm shadow"
                onClick={() => navigate(`/edit-trade/${trade.id}`)}
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}