import { useEffect, useState } from "react"
import { useApi } from "../utils/api"
import { PnLLineChart } from "./PnLLineChart"
import { StatsTable } from "./StatsTable"
import { MistakesTable } from "./MistakesTable"

export function Dashboard() {
    const { makeRequest } = useApi()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(null)
    const [error, setError] = useState(null)

    useEffect(() => {
        ;(async () => {
            try {
                const res = await makeRequest("dashboard")
                setData(res)
            } catch (e) {
                setError("Failed to load dashboard.")
            } finally {
                setLoading(false)
            }
        }) ()
    }, [])

    if (loading) return <div className="text-white/80">Loading dashboard…</div>
    if (error) return <div className="text-red-400">{error}</div>
    if (!data) return null

    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <h2 className="text-2xl font-semibold text-pink-400">Dashboard</h2>
                <div className="text-white/60 text-sm">
                Closed trades only
                </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow">
                <h3 className="text-black font-semibold mb-2">Profit &amp; Loss Over Time</h3>
                <PnLLineChart seriesData={data.equity_curve || []} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-4 shadow">
                    <h3 className="text-black font-semibold mb-2">Performance Stats</h3>
                    <StatsTable stats={data.stats} />
                </div>

                <div className="bg-white rounded-2xl p-4 shadow">
                    <h3 className="text-black font-semibold mb-2">Mistakes</h3>
                    <MistakesTable rows={data.mistakes || []} />
                </div>
            </div>
        </div>
    )
}