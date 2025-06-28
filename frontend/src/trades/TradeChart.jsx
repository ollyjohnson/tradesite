import { createChart, CandlestickSeries, createSeriesMarkers } from 'lightweight-charts'
import { useEffect, useRef } from 'react'

export function TradeChart() {
  const chartContainerRef = useRef(null)

useEffect(() => {
  if (!chartContainerRef.current) return

  const container = chartContainerRef.current
  const chart = createChart(container, {
    width: container.clientWidth,
    height: 300,
    layout: {
      textColor: '#000',
      background: { type: 'solid', color: '#fff' },
    },
  })

  const candlestickSeries = chart.addSeries(CandlestickSeries, {
    upColor: '#26a69a',
    downColor: '#ef5350',
    borderVisible: false,
    wickUpColor: '#26a69a',
    wickDownColor: '#ef5350',
  })

  const hardcodedData = [
      { time: '2018-12-22', open: 75.16, high: 82.84, low: 36.16, close: 45.72 },
      { time: '2018-12-23', open: 45.12, high: 53.90, low: 45.12, close: 48.09 },
      { time: '2018-12-24', open: 60.71, high: 60.71, low: 53.39, close: 59.29 },
      { time: '2018-12-25', open: 68.26, high: 68.26, low: 59.04, close: 60.50 },
      { time: '2018-12-26', open: 67.71, high: 105.85, low: 66.67, close: 91.04 },
      { time: '2018-12-27', open: 91.04, high: 121.40, low: 82.70, close: 111.40 },
      { time: '2018-12-28', open: 111.51, high: 142.83, low: 103.34, close: 131.25 },
      { time: '2018-12-29', open: 131.33, high: 151.17, low: 77.68, close: 96.43 },
      { time: '2018-12-30', open: 106.33, high: 110.20, low: 90.39, close: 98.10 },
      { time: '2018-12-31', open: 109.87, high: 114.69, low: 85.66, close: 111.26 },
    ]

  candlestickSeries.setData(hardcodedData)

  const markers = [
      {
        time: '2018-12-25',
        position: 'belowBar',
        color: 'green',
        shape: 'arrowUp',
        text: 'Buy @ 61',
      },
      {
        time: '2018-12-28',
        position: 'aboveBar',
        color: 'red',
        shape: 'arrowDown',
        text: 'Sell @ 120',
      },
    ]

  createSeriesMarkers(candlestickSeries, markers)
  chart.timeScale().fitContent()

  const handleResize = () => {
    chart.applyOptions({ width: container.clientWidth })
  }

  window.addEventListener('resize', handleResize)

  return () => {
    window.removeEventListener('resize', handleResize)
    chart.remove()
  }
}, [])


  return <div ref={chartContainerRef} style={{ width: '100%', height: 300 }} />
}