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

    const [editing, setEditing] = useState(false)
    const [editMistake, setEditMistake] = useState("")
    const [editNotes, setEditNotes] = useState("")
    const [saving, setSaving] = useState(false)


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

    const handleSaveDetails = async () => {
      if (!trade) return
      setSaving(true)
      try {
        const payload = {
          mistake: editMistake,
          notes: editNotes,
        }
      await makeRequest(`trades/${id}/notes`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      })

      setTrade((prev) => ({
        ...prev,
        mistake: editMistake,
        notes: editNotes,
      }))
      setEditing(false)
      } catch (err) {
        console.error(err)
        alert("Failed to save changes. Please try again.")
      } finally {
        setSaving(false)
      }
    }

    if(loading) return <p className="text-white text-center mt-4">Loading...</p>
    if(error) return <p className="text-red-400 text-center mt-4">{error}</p>
    if(!trade) return null

    return (
    <div className="p-6 max-w-3xl mx-auto text-white">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{trade.ticker} Trade Details</h1>

        {/* NEW: Edit / Save / Cancel buttons */}
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="bg-pink-600 hover:bg-pink-500 text-white px-3 py-1 rounded-md text-sm shadow"
          >
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleSaveDetails}
              disabled={saving}
              className="bg-green-600 hover:bg-green-500 disabled:bg-green-900 text-white px-3 py-1 rounded-md text-sm shadow"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => {
                setEditing(false)
                setEditMistake(trade.mistake || "")
                setEditNotes(trade.notes || "")
              }}
              disabled={saving}
              className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded-md text-sm shadow"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <span className="font-semibold text-white">Type: </span>{" "}
          {trade.trade_type}
        </div>

        <div>
          <span className="font-semibold text-white">Mistake: </span>
          {!editing ? (
            trade.mistake
          ) : (
            <input
              className="mt-1 w-full bg-black/40 border border-white/20 rounded px-2 py-1 text-sm"
              value={editMistake}
              onChange={(e) => setEditMistake(e.target.value)}
            />
          )}
        </div>

        <div className="sm:col-span-2">
          <span className="font-semibold text-white block mb-1">Notes: </span>
          {!editing ? (
            <p className="text-white/80 whitespace-pre-wrap">
              {trade.notes || "—"}
            </p>
          ) : (
            <textarea
              className="w-full bg-black/40 border border-white/20 rounded px-2 py-1 text-sm min-h-[80px]"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
            />
          )}
        </div>

        <div>
          <span className="font-semibold text-white">Status: </span>{" "}
          {trade.status}
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

      <br />

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
            const d = new Date(tx.date)
            return (
              <li key={i}>
                {tx.type.toUpperCase()} {tx.amount} @ ${tx.price} on{" "}
                {d.toLocaleDateString()} at {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}{" "}
                (Fees: ${tx.commissions})
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}