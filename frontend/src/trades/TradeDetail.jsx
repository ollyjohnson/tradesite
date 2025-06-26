import { use, useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { useApi } from "../utils/api"
import { TradeChart } from "./TradeChart"

export function TradeDetail() {
    const { id } = useParams()
    const { makeRequest } = useApi()
    const [trade, setTrade] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchTrade = async () => {
            try {
                const data = await makeRequest(`trades/${id}`)
                setTrade(data.trade)
            } catch (err) {
                console.error(err)
                setError("Could not load trade details.")
            } finally {
                setLoading(false)
            }
        }

        fetchTrade()
    }, [id])

    const formatPnl = (pnl, status) => {
        if (status == "Open") return <span style={{color: "black"}} > Open </span>
        if (pnl > 0) return <span style={{color: "green"}} > +{pnl.toFixed(2)}</span>
        if (pnl < 0) return <span style={{color: "red"}} > {pnl.toFixed(2)}</span>
        return <span style={{color: "black" }}>0.00</span>
    }

    if(loading) return <p className="text-white text-center mt-4">Loading...</p>
    if(error) return <p className="text-red-400 text-center mt-4">{error}</p>

    return (
    <div className="p-6 max-w-3xl mx-auto text-white">
      <h1 className="text-2xl font-bold mb-4">{trade.ticker} Trade Details</h1>

      <div className="mb-6">
        <p><strong>Status:</strong> {trade.status}</p>
        <p><strong>Mistake:</strong> {trade.mistake}</p>
        <p><strong>Notes:</strong> {trade.notes || "None"}</p>
        <p><strong>Type:</strong> {trade.trade_type}</p>
        <p><strong>Date Range:</strong> {trade.earliest_transaction && new Date(trade.earliest_transaction).toLocaleDateString()} to {trade.latest_transaction && new Date(trade.latest_transaction).toLocaleDateString()}</p>
        <p><strong>PnL:</strong> {formatPnl(trade.pnl, trade.status)}</p>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Price Chart</h2>
        <TradeChart
          symbol={trade.ticker}
          startDate={trade.earliest_transaction}
          endDate={trade.latest_transaction}
        />
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Transactions</h2>
        <ul className="pl-4 list-disc">
          {trade.transactions?.map((tx, i) => (
            <li key={i}>
              {tx.type.toUpperCase()} {tx.amount} @ ${tx.price} on {new Date(tx.date).toLocaleDateString()} (Fees: ${tx.commissions})
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}