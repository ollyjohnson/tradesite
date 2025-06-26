import { createChart } from 'lightweight-charts'
import { useEffect, useState } from 'react'

export function TradeChart({symbol, startDate, endDate }) {
    const [chartData, setChartData] = useState([])

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`/api/stock-data?symbol=${symbol}&start_date=${startDate}&end_date=${endDate}`)
                const result = await res.json()
                const raw = result.data

                const transformed = Object.entries(raw).map(([date, val]) => ({
                time: date,
                value: parseFloat(val["5. adjusted close"]),
                })).sort((a, b) => new Date(a.time) - new Date(b.time))

                setChartData(transformed)
            } catch (err) {
                console.error("Chart data fetch error", err)
            }
        }

        fetchData()
    }, [symbol, startDate, endDate])

    useEffect(() => {
        if (!chartData.length) return

        const chart = createChart(document.getElementById("chart-container"), {
        width: 600,
        height: 300,
        })
        const series = chart.addLineSeries()
        series.setData(chartData)

        return () => chart.remove()
    }, [chartData])

    return <div id="chart-container" />
}