function fmtMoney(v) {
  const n = Number(v || 0)
  const sign = n > 0 ? "+" : ""
  return `${sign}${n.toFixed(2)}`
}
function fmtPct(v) {
  const n = Number(v || 0)
  const sign = n > 0 ? "+" : ""
  return `${sign}${n.toFixed(2)}%`
}

export function StatsTable({ stats }) {
  const rows = [
    ["Total P/L", fmtMoney(stats.total_pnl)],
    ["Avg Loss", fmtMoney(stats.avg_loss)],
    ["Avg Win", fmtMoney(stats.avg_win)],
    ["Max Loss", fmtMoney(stats.max_loss)],
    ["Max Win", fmtMoney(stats.max_win)],
    ["Win %", fmtPct(stats.win_pct)],
    ["Profit Factor", stats.profit_factor === null ? "—" : (stats.profit_factor === Infinity ? "∞" : stats.profit_factor)],
    ["Avg Loss %", fmtPct(stats.avg_loss_pct)],
    ["Avg Gain %", fmtPct(stats.avg_gain_pct)],
    ["Max Loss % of Price", fmtPct(stats.max_loss_pct)],
    ["Max Gain % of Price", fmtPct(stats.max_gain_pct)],
  ]

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-t border-black/10">
              <td className="py-2 pr-3 text-black/70">{k}</td>
              <td className="py-2 text-black font-semibold text-right">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
