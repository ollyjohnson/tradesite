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

  const [csvFile, setCsvFile] = useState(null)
  const [importingCsv, setImportingCsv] = useState(false)

  const formatDate = (iso) => iso?.split("T")[0] || ""

  useEffect(() => {
    if (initialData) {
      setTicker(initialData.ticker || "")
      setMistake(initialData.mistake || "")
      setNotes(initialData.notes || "")

      const buyTxs = initialData.transactions
        .filter((t) => t.type === "buy")
        .map((t) => ({ ...t, date: formatDate(t.date) }))

      const sellTxs = initialData.transactions
        .filter((t) => t.type === "sell")
        .map((t) => ({ ...t, date: formatDate(t.date) }))

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

  const handleImportCsv = async () => {
    if (!csvFile) return

    setImportingCsv(true)
    setMessage(null)

    try {
      const formData = new FormData()
      formData.append("file", csvFile)

      const result = await makeRequest("trades/import-csv", {
        method: "POST",
        body: formData,
      })

      const count =
        result?.count ??
        (Array.isArray(result?.created_trade_ids)
          ? result.created_trade_ids.length
          : 0)

      setMessage(`Imported ${count} trade(s) from CSV.`)
    } catch (err) {
      console.error(err)
      setMessage("CSV import failed: " + err.message)
    } finally {
      setImportingCsv(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const transactions = [
      ...buys.map((tx) => ({ ...tx, type: "buy" })),
      ...sells.map((tx) => ({ ...tx, type: "sell" })),
    ].map((tx) => ({
      ...tx,
      amount: parseFloat(tx.amount),
      price: parseFloat(tx.price),
      commissions: parseFloat(tx.commissions),
      date: new Date(tx.date).toISOString(),
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
    <div className="challenge-container space-y-8">
      {/* SECTION 1: Import trades */}
      <section className="p-4 border border-white/10 rounded-md bg-white/5">
        <h2 className="text-xl font-semibold text-pink-400 mb-2">
          Import Trades from CSV (AI)
        </h2>
        <p className="text-sm text-white/70 mb-3">
          Upload a CSV export from your broker. The AI will read it and create
          trades directly in your journal.
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
            className="input"
          />

          <button
            type="button"
            onClick={handleImportCsv}
            disabled={!csvFile || importingCsv}
            className="bg-pink-600 hover:bg-pink-500 disabled:bg-gray-500 text-white px-4 py-2 rounded-md text-sm shadow"
          >
            {importingCsv ? "Importing..." : "Import CSV"}
          </button>
        </div>
      </section>

      {/* SECTION 2: Log a trade manually */}
      <section className="p-4 border border-white/10 rounded-md bg-white/5">
        <h2 className="text-xl font-semibold mb-4">
          {onSubmit ? "Edit Trade" : "Log a Trade Manually"}
        </h2>

        <form onSubmit={handleSubmit}>
          <label>Ticker Symbol</label>
          <input
            className="input"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            required
          />

          <label>Mistake</label>
          <input
            className="input"
            value={mistake}
            onChange={(e) => setMistake(e.target.value)}
            required
          />

          <label>Notes</label>
          <textarea
            className="input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          {/* Buy Transactions */}
          <h3 className="text-xl font-semibold text-pink-400 mb-2 mt-6">
            Buy Transactions
          </h3>
          <button
            type="button"
            onClick={() => handleAddRow(setBuys, buys)}
            className="mb-4 bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 rounded-md text-sm shadow"
          >
            Add Buy
          </button>

          {buys.map((buy, i) => (
            <div
              key={`buy-${i}`}
              className="grid grid-cols-4 gap-4 mb-4 fade-in"
            >
              <input
                type="date"
                value={buy.date}
                onChange={(e) =>
                  handleChange(buys, setBuys, i, "date", e.target.value)
                }
                className="input"
                required
              />
              <input
                type="number"
                value={buy.amount}
                placeholder="Shares"
                onChange={(e) =>
                  handleChange(buys, setBuys, i, "amount", e.target.value)
                }
                className="input"
                required
              />
              <input
                type="number"
                value={buy.price}
                placeholder="Price"
                onChange={(e) =>
                  handleChange(buys, setBuys, i, "price", e.target.value)
                }
                className="input"
                required
              />
              <input
                type="number"
                value={buy.commissions}
                placeholder="Commissions"
                onChange={(e) =>
                  handleChange(
                    buys,
                    setBuys,
                    i,
                    "commissions",
                    e.target.value
                  )
                }
                className="input"
                required
              />
            </div>
          ))}

          {/* Sell Transactions */}
          <h3 className="text-xl font-semibold text-pink-400 mb-2 mt-6">
            Sell Transactions
          </h3>
          <button
            type="button"
            onClick={() => handleAddRow(setSells, sells)}
            className="mb-4 bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 rounded-md text-sm shadow"
          >
            Add Sell
          </button>

          {sells.map((sell, i) => (
            <div
              key={`sell-${i}`}
              className="grid grid-cols-4 gap-4 mb-4 fade-in"
            >
              <input
                type="date"
                value={sell.date}
                onChange={(e) =>
                  handleChange(sells, setSells, i, "date", e.target.value)
                }
                className="input"
                required
              />
              <input
                type="number"
                value={sell.amount}
                placeholder="Shares"
                onChange={(e) =>
                  handleChange(sells, setSells, i, "amount", e.target.value)
                }
                className="input"
                required
              />
              <input
                type="number"
                value={sell.price}
                placeholder="Price"
                onChange={(e) =>
                  handleChange(sells, setSells, i, "price", e.target.value)
                }
                className="input"
                required
              />
              <input
                type="number"
                value={sell.commissions}
                placeholder="Commissions"
                onChange={(e) =>
                  handleChange(
                    sells,
                    setSells,
                    i,
                    "commissions",
                    e.target.value
                  )
                }
                className="input"
                required
              />
            </div>
          ))}

          <br />
          <br />
          <button type="submit" className="generate-button">
            {onSubmit ? "Save Changes" : "Submit Trade"}
          </button>
        </form>
      </section>

      {message && (
        <div className="quota-display">
          <p>{message}</p>
        </div>
      )}
    </div>
  )
}
