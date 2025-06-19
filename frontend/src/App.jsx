import {ClerkProviderWithRoutes} from "./auth/ClerkProviderWithRoutes.jsx"
import {Routes, Route} from "react-router-dom"
import {Layout} from "./layout/layout.jsx"
import {TradeLog} from "./trades/TradeLog.jsx"
import { HistoryPanel } from './history/HistroyPanel.jsx'
import { AuthenticationPage } from "./auth/AuthenticationPage.jsx"
import './App.css'

function App() {
  return <ClerkProviderWithRoutes>
    <Routes>
      <Route path="/sign-in/*" element={<AuthenticationPage />}/>
      <Route path="/sign-up" element={<AuthenticationPage />}/>
      <Route element = {<Layout />}> 
        <Route path ="/" element={<TradeLog />}/>
        <Route path ="/history" element={<HistoryPanel />}/>
      </Route>
    </Routes>
  </ClerkProviderWithRoutes>
}

export default App
