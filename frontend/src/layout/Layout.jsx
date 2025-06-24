import "react"
import {SignedIn, SignedOut, UserButton} from "@clerk/clerk-react"
import {Outlet, Link, Navigate} from "react-router-dom"

export function Layout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <header className="navbar px-6 py-4 border-b border-white/10 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Trade Journal</h1>
        
        <nav className="flex items-center gap-6 text-sm">
          <SignedIn>
            <Link to="/" className="hover:text-pink-400 transition">
              My Trades
            </Link>
            <Link to="/log-trade" className="hover:text-pink-400 transition">
              Log Trade
            </Link>
            <UserButton afterSignOutUrl="/sign-in" />
          </SignedIn>
        </nav>
      </header>

      <main className="app-main px-6 py-8">
        <SignedOut>
          <Navigate to="/sign-in" replace />
        </SignedOut>
        <SignedIn>
          <Outlet />
        </SignedIn>
      </main>
    </div>
  )
}