import { useEffect, useState } from "react"
import { useApi } from "../utils/api"

export function TradeList() {
    const { makeRequest } = useApi()
    const [trades, setTrades] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetchTrades()
    }, [])

    const fetchTrades = async () => {
        try {
            const data = await makeRequest("trades")
            setTrades(data.trades)
        } catch(err) {
            setError("Failed to load trades.")
        } finally {
            setLoading(false)
        }
    }

    const formatPnl = (pnl, status) => {
        if (status == "Open") return <span style={{color: "black"}} > Open </span>
        if (pnl > 0) return <span style={{color: "green"}} > +{pnl.toFixed(2)}</span>
        if (pnl < 0) return <span style={{color: "red"}} > -{pnl.toFixed(2)}</span>
        return <span style={{color: "black" }}>0.00</span>
    }

    if (loading) return <div className="loading">Loading trades...</div>
    if (error) return <div className="error-message">{error}</div>

    return (
        <div className="history-panel">
            <h2>Your Trades</h2>
            {trades.length === 0 ? (
                <p>No trades yet.</p>
            ) : (
                <div className="history-list">
                    {trades.map((trade) => (
                        <div className="history-item" key={trades.id}>
                            <strong>{trades.ticker}</strong><br />
                            <em>{trades.notes}</em>
                            <em>{trades.notes}</em>
                            <p>Status: {trades.status}</p>
                            <p>Profit/Loss: {formatPnl(trades.pnl, trades.status)}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}