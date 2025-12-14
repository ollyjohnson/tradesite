function fmtMoney(v) {
  const n = Number(v || 0)
  const sign = n > 0 ? "+" : ""
  return `${sign}${n.toFixed(2)}`
}

export function MistakesTable({ rows = [] }) {
  if (!rows.length) {
    return <div className="text-black/60 text-sm">No mistake data yet.</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-black/70">
            <th className="py-2">Mistake</th>
            <th className="py-2">Frequency</th>
            <th className="py-2 text-right">P/L</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.mistake} className="border-t border-black/10">
              <td className="py-2 text-black">{r.mistake}</td>
              <td className="py-2 text-black/80">{r.count}</td>
              <td className="py-2 text-right font-semibold text-black">
                {fmtMoney(r.pnl)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
