import { useEffect, useRef } from "react"
import { createChart, LineSeries } from "lightweight-charts"

export function PnLLineChart({ seriesData = [] }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current) return

    const container = ref.current
    const chart = createChart(container, {
      width: container.clientWidth,
      height: 320,
      layout: { textColor: "#000", background: { type: "solid", color: "#fff" } },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
    })

    const line = chart.addSeries(LineSeries, { lineWidth: 2 })
    line.setData(seriesData)

    chart.timeScale().fitContent()

    const onResize = () => chart.applyOptions({ width: container.clientWidth })
    window.addEventListener("resize", onResize)

    return () => {
      window.removeEventListener("resize", onResize)
      chart.remove()
    }
  }, [JSON.stringify(seriesData)])

  if (!seriesData.length) {
    return <div className="text-black/60 text-sm">No closed trades yet.</div>
  }

  return <div ref={ref} style={{ width: "100%", height: 320 }} />
}
