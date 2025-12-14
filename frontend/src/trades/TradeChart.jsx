import { createChart, CandlestickSeries, LineSeries, createSeriesMarkers } from 'lightweight-charts'
import { useEffect, useRef, useState } from "react"
import { useAlpha } from "../utils/api"

export function TradeChart({ symbol, startDate, endDate, transactions = [] }) {
  const chartContainerRef = useRef(null)
  const { makeRequest } = useAlpha()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!chartContainerRef.current || !symbol || !startDate || !endDate) return

    const container = chartContainerRef.current
    let chart
    let series

    const toDateOnly = (value) => {
      if (!value) return ""
      if (typeof value === "string") {
        return value.split("T")[0]
      }
      return new Date(value).toISOString().split("T")[0]
    }

    const calcSMA = (candles, period) => {
      const result = []
      if (!candles || candles.length < period) return result

      let sum = 0
      for (let i = 0; i < candles.length; i++) {
        const price = candles[i].close
        sum += price

        if (i >= period) {
          sum -= candles[i - period].close
        }

        if (i >= period - 1) {
          result.push({
            time: candles[i].time,
            value: sum / period,
          })
        }
      }
      return result
    }

    const initChart = async () => {
      setLoading(true)
      setError(null)

      chart = createChart(container, {
        width: container.clientWidth,
        height: 300,
        layout: {
          textColor: "#000",
          background: { type: "solid", color: "#fff" },
        },
        grid: {
          vertLines: { visible: false },
          horzLines: { visible: false },
        },
        crosshair: {
          mode: 0,
        },
        rightPriceScale: {
          borderVisible: false,
        },
        timeScale: {
          borderVisible: false,
        },
      })

      series = chart.addSeries(CandlestickSeries, {
        upColor: "#26a69a",
        downColor: "#ef5350",
        borderVisible: false,
        wickUpColor: "#26a69a",
        wickDownColor: "#ef5350",
      })

      try {
        // fetch candlestick data from backend
        const params = new URLSearchParams({
          symbol,
          start_date: toDateOnly(startDate),
          end_date: toDateOnly(endDate),
        })

        const data = await makeRequest(`stock-data?${params.toString()}`)

        series.setData(data)

        // compute 10 and 20 day SMAs
        const sma10 = calcSMA(data, 10)
        const sma20 = calcSMA(data, 20)

        const ma10Series = chart.addSeries(LineSeries, {
          lineWidth: 1,
          color: '#ab30f2',
        })
        ma10Series.setData(sma10)

        const ma20Series = chart.addSeries(LineSeries, {
          lineWidth: 1,
          color: '#c3de14',
        })
        ma20Series.setData(sma20)

        // add transaction markers
        const markers = (transactions || [])
          .filter((tx) => tx.date && tx.type && tx.amount && tx.price)
          .map((tx) => {
            const isBuy = tx.type.toLowerCase() === "buy"

            const iso =
              typeof tx.date === "string"
                ? tx.date
                : new Date(tx.date).toISOString()

            const dateStr = iso.split("T")[0]

            return {
              time: dateStr,
              position: isBuy ? "belowBar" : "aboveBar",
              color: isBuy ? "green" : "red",
              shape: isBuy ? "arrowUp" : "arrowDown",
              text: `${isBuy ? "Buy" : "Sell"} ${tx.amount} @ ${tx.price}`,
            }
          })

        createSeriesMarkers(series, markers)

        chart.timeScale().fitContent()
      } catch (err) {
        console.error("Failed to load chart data:", err)
        setError("Could not load price data for this trade.")
      } finally {
        setLoading(false)
      }
    }

    initChart()

    const handleResize = () => {
      if (chart && container) {
        chart.applyOptions({ width: container.clientWidth })
      }
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      if (chart) {
        chart.remove()
      }
    }
  }, [symbol, startDate, endDate, JSON.stringify(transactions)])

  return (
    <div className="relative" style={{ width: "100%", height: 300 }}>
      {loading && (
        <p className="absolute top-2 left-2 text-xs text-black/60">
          Loading chart…
        </p>
      )}
      {error && (
        <p className="absolute top-2 right-2 text-xs text-red-500">{error}</p>
      )}
      <div ref={chartContainerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  )
}
