import { useEffect, useState } from "react"
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <span className="font-semibold text-white">Type: </span> {trade.trade_type}
        </div>
        <div>
          <span className="font-semibold text-white">Mistake: </span> {trade.mistake}
        </div>
        <div className="sm:col-span-2">
          <span className="font-semibold text-white block mb-1">Notes: </span>
          <p className="text-white/80">{trade.notes}</p>
        </div>
        <div>
          <span className="font-semibold text-white">Status: </span> {trade.status}
        </div>
        <div>
          <span className="font-semibold text-white">Date Range: </span>{" "}
          {new Date(trade.earliest_transaction).toLocaleDateString()} to{" "}
          {new Date(trade.latest_transaction).toLocaleDateString()}
        </div>
        <div className="sm:col-span-2">
          <span className="font-semibold text-white">PnL: </span>{" "}
          {formatPnl(trade.pnl, trade.status)}
        </div>
      </div>
      <br></br>
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Price Chart</h2>
        <TradeChart
          symbol={trade.ticker}
          startDate={trade.earliest_transaction}
          endDate={trade.latest_transaction}
          transactions={trade.transactions}
        />
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Transactions</h2>
        <ul className="pl-4 list-disc">
          {trade.transactions?.map((tx, i) => {
            const dt = new Date(tx.date)
            const dateStr = dt.toLocaleDateString()
            const timeStr = dt.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })

            return (
              <li key={i}>
                {tx.type.toUpperCase()} {tx.amount} @ ${tx.price} on {dateStr} at{" "}
                {timeStr} (Fees: ${tx.commissions})
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}