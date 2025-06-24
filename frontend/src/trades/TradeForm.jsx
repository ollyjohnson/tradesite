import { useEffect, useState } from "react"
import { useApi } from "../utils/api"

export function TradeForm({ initialData = null, onSubmit = null }) {
  const { makeRequest } = useApi()

  const [ticker, setTicker] = useState("")
  const [mistake, setMistake] = useState("")
  const [notes, setNotes] = useState("")
  const [buys, setBuys] = useState([])
  const [sells, setSells] = useState([])
  const [message, setMessage] = useState(null)

  const formatDate = (iso) => iso?.split("T")[0] || ""

  useEffect(() => {
    if (initialData) {
      setTicker(initialData.ticker || "")
      setMistake(initialData.mistake || "")
      setNotes(initialData.notes || "")

      const buyTxs = initialData.transactions
        .filter(t => t.type === "buy")
        .map(t => ({ ...t, date: formatDate(t.date) }))

      const sellTxs = initialData.transactions
        .filter(t => t.type === "sell")
        .map(t => ({ ...t, date: formatDate(t.date) }))

      setBuys(buyTxs)
      setSells(sellTxs)
    }
  }, [initialData])

  const handleAddRow = (setList, list) => {
    setList([...list, { date: "", amount: "", price: "", commissions: "" }])
  }

  const handleChange = (list, setList, index, field, value) => {
    const updated = [...list]
    updated[index][field] = value
    setList(updated)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const transactions = [
      ...buys.map(tx => ({ ...tx, type: "buy" })),
      ...sells.map(tx => ({ ...tx, type: "sell" }))
    ].map(tx => ({
      ...tx,
      amount: parseFloat(tx.amount),
      price: parseFloat(tx.price),
      commissions: parseFloat(tx.commissions),
      date: new Date(tx.date).toISOString()
    }))

    const payload = { ticker, mistake, notes, transactions }

    try {
      if (onSubmit) {
        await onSubmit(payload)
      } else {
        await makeRequest("trades", {
          method: "POST",
          body: JSON.stringify(payload),
        })
        setMessage("Trade successfully logged!")
      }
    } catch (err) {
      setMessage("Error: " + err.message)
    }
  }

  return (
    <div className="challenge-container">
      <h2>{onSubmit ? "Edit Trade" : "Log a Trade"}</h2>
      <form onSubmit={handleSubmit}>
        <label>Ticker Symbol</label>
        <input className="input" value={ticker} onChange={e => setTicker(e.target.value)} required />

        <label>Mistake</label>
        <input className="input" value={mistake} onChange={e => setMistake(e.target.value)} required />

        <label>Notes</label>
        <textarea className="input" value={notes} onChange={e => setNotes(e.target.value)} />

        {/* Buy Transactions */}
        <h3 className="text-xl font-semibold text-pink-400 mb-2">Buy Transactions</h3>
        <button
          type="button"
          onClick={() => handleAddRow(setBuys, buys)}
          className="mb-4 bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 rounded-md text-sm shadow"
        >
          Add Buy
        </button>

        {buys.map((buy, i) => (
          <div key={`buy-${i}`} className="grid grid-cols-4 gap-4 mb-4 fade-in">
            <input
              type="date"
              value={buy.date}
              onChange={e => handleChange(buys, setBuys, i, "date", e.target.value)}
              className="input"
              required
            />
            <input
              type="number"
              value={buy.amount}
              placeholder="Shares"
              onChange={e => handleChange(buys, setBuys, i, "amount", e.target.value)}
              className="input"
              required
            />
            <input
              type="number"
              value={buy.price}
              placeholder="Price"
              onChange={e => handleChange(buys, setBuys, i, "price", e.target.value)}
              className="input"
              required
            />
            <input
              type="number"
              value={buy.commissions}
              placeholder="Commissions"
              onChange={e => handleChange(buys, setBuys, i, "commissions", e.target.value)}
              className="input"
              required
            />
          </div>
        ))}

        {/* Sell Transactions */}
        <h3 className="text-xl font-semibold text-pink-400 mb-2 mt-6">Sell Transactions</h3>
        <button
          type="button"
          onClick={() => handleAddRow(setSells, sells)}
          className="mb-4 bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 rounded-md text-sm shadow"
        >
          Add Sell
        </button>

        {sells.map((sell, i) => (
          <div key={`sell-${i}`} className="grid grid-cols-4 gap-4 mb-4 fade-in">
            <input
              type="date"
              value={sell.date}
              onChange={e => handleChange(sells, setSells, i, "date", e.target.value)}
              className="input"
              required
            />
            <input
              type="number"
              value={sell.amount}
              placeholder="Shares"
              onChange={e => handleChange(sells, setSells, i, "amount", e.target.value)}
              className="input"
              required
            />
            <input
              type="number"
              value={sell.price}
              placeholder="Price"
              onChange={e => handleChange(sells, setSells, i, "price", e.target.value)}
              className="input"
              required
            />
            <input
              type="number"
              value={sell.commissions}
              placeholder="Commissions"
              onChange={e => handleChange(sells, setSells, i, "commissions", e.target.value)}
              className="input"
              required
            />
          </div>
        ))}
        <br /><br />
        <button type="submit" className="generate-button">{onSubmit ? "Save Changes" : "Submit Trade"}</button>
      </form>

      {message && <div className="quota-display"><p>{message}</p></div>}
    </div>
  )
}
