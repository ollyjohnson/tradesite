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

    const handleDeleteAll = async () => {
      const confirmed = window.confirm(
        "Are you sure you want to delete ALL trades? This cannot be undone."
      )
      if (!confirmed) return

      try {
        await makeRequest("trades", {
          method: "DELETE",
        })
        await fetchTrades()
      } catch (err) {
        console.error("Failed to delete all trades", err)
        alert("Failed to delete all trades. Please try again.")
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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-pink-400">Your Trades</h2>
        {trades.length > 0 && (
          <button
            onClick={handleDeleteAll}
            className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-md text-sm shadow cursor-pointer"
          >
            Delete All
          </button>
        )}
      </div>
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
            <div className="w-[300px]"></div>
          </div>

          {trades.map((trade) => (
            <div
              key={trade.id}
              className="relative -mx-2 px-2 rounded-md hover:bg-white/5 transition">
              <div
                className="flex text-white/80 items-center py-3"
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
                <div className="ml-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/edit-trade/${trade.id}`)
                    }}
                    className="bg-pink-500 text-white bg-opacity-50 px-3 py-1 rounded hover:bg-pink-600 transition"
                  >
                    Edit
                  </button>
                </div>
                <div className="ml-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/trade/${trade.id}`)
                    }}
                    className="bg-pink-500 text-white bg-opacity-50 px-3 py-1 rounded hover:bg-pink-600 transition"
                  >
                    Details
                  </button>
                </div>
                <div className="ml-4">
                  <button
                    onClick={async (e) => {
                      e.stopPropagation()
                      const confirmed = window.confirm("Are you sure want to delete this trade?")
                      if (!confirmed) return

                      try {
                        await makeRequest(`trades/${trade.id}`, {
                          method: "DELETE",
                        })
                        await fetchTrades()
                      } catch (err) {
                        console.error("Failed to delete trade", err)
                        alert("Failed to delete trade. Please try again.")
                      }
                    }}
                    className="bg-pink-500 bg-opacity-50 text-white px-3 py-1 rounded hover:bg-pink-600 transition cursor-pointer"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}