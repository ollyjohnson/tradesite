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
          <div className="flex text-white font-semibold border-b border-white/10 pb-2 mb-2">
            <div className="w-1/6">Ticker</div>
            <div className="w-1/6">Type</div>
            <div className="w-1/6">Open Date</div>
            <div className="w-1/6">Close Date</div>
            <div className="w-1/6">Mistake</div>
            <div className="w-1/6">PnL</div>
          </div>

          {trades.map((trade) => (
            <div
              key={trade.id}
              className="flex text-white/80 items-center border-b border-white/10 py-3 hover:bg-white/5 transition"
              onClick={() => navigate(`/trade/${trade.id}`)}
            >
              <div className="w-1/6 font-bold">{trade.ticker}</div>
              <div className="w-1/6">{trade.trade_type}</div>
              <div className="w-1/6">
                {trade.earliest_transaction
                  ? new Date(trade.earliest_transaction).toLocaleDateString()
                  : "N/A"}
              </div>
              <div className="w-1/6">
                {trade.status === "Closed" && trade.latest_transaction
                  ? new Date(trade.latest_transaction).toLocaleDateString()
                  : "Open"}
              </div>
              <div className="w-1/6">{trade.mistake}</div>
              <div className="w-1/6">{formatPnl(trade.pnl, trade.status)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}