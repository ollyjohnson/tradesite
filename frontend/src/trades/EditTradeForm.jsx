import { useState } from "react"
import { useApi } from "../utils/api"

export function TradeForm() {
  const { makeRequest } = useApi()
  const [ticker, setTicker] = useState("")
  const [mistake, setMistake] = useState("")
  const [notes, setNotes] = useState("")
  const [buys, setBuys] = useState([{ date: "", amount: "", price: "", commissions: ""}])
  const [sells, setSells] = useState([{ date: "", amount: "", price: "", commissions: ""}])
  const [message, setMessage] = useState(null)

  const handleAddRow = (setList, list) => {
    setList([...list, { date: "", amount: "", price: "", commissions: ""}])
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
      date: new Date(tx.date).toISOString(),
      commissions: parseFloat(tx.commissions)
    }))

    try {
      await makeRequest("trades", {
        method: "POST",
        body: JSON.stringify({ ticker, mistake, notes, transactions })
      })
      setMessage("Trade successfully logged!")
    } catch (err) {
      setMessage("Error: " + err.message)
    }
  }

  return (
    <div className="challenge-container">
      <h2>Log a Trade</h2>
      <form onSubmit={handleSubmit}>
        <label>Ticker Symbol</label>
        <input value={ticker} onChange={e => setTicker(e.target.value)} required />

        <label>Mistake</label>
        <input value={mistake} onChange={e => setMistake(e.target.value)} required />

        <label>Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} />

        <h3>Buy Transactions</h3>
        {buys.map((buy, i) => (
          <div key={i}>
            <input type="date" value={buy.date} onChange={e => handleChange(buys, setBuys, i, "date", e.target.value)} required />
            <input type="number" value={buy.amount} placeholder="Shares" onChange={e => handleChange(buys, setBuys, i, "amount", e.target.value)} required />
            <input type="number" value={buy.price} placeholder="Price" onChange={e => handleChange(buys, setBuys, i, "price", e.target.value)} required />
            <input type="number" value={buy.commissions} placeholder="Commissions" onChange={e => handleChange(buys, setBuys, i, "commissions", e.target.value)} required />
          </div>
        ))}
        <button type="button" onClick={() => handleAddRow(setBuys, buys)}>Add Buy</button>

        <h3>Sell Transactions</h3>
        {sells.map((sell, i) => (
          <div key={i}>
            <input type="date" value={sell.date} onChange={e => handleChange(sells, setSells, i, "date", e.target.value)} />
            <input type="number" value={sell.amount} placeholder="Shares" onChange={e => handleChange(sells, setSells, i, "amount", e.target.value)} />
            <input type="number" value={sell.price} placeholder="Price" onChange={e => handleChange(sells, setSells, i, "price", e.target.value)} />
            <input type="number" value={sell.commissions} placeholder="Commissions" onChange={e => handleChange(sells, setSells, i, "commissions", e.target.value)} required />
          </div>
        ))}

        <button type="button" onClick={() => handleAddRow(setSells, sells)}>Add Sell</button>

        <br /><br />
        <button type="submit" className="generate-button">Submit Trade</button>
      </form>

      {message && <div className="quota-display"><p>{message}</p></div>}
    </div>
  )
}
