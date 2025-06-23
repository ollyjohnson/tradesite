import ClerkProviderWithRoutes from "./auth/ClerkProviderWithRoutes.jsx"
import {Routes, Route} from "react-router-dom"
import {Layout} from "./layout/Layout.jsx"
import {ChallengeGenerator} from "./challenge/ChallengeGenerator.jsx"
import {HistoryPanel} from "./history/HistoryPanel.jsx"
import {AuthenticationPage} from "./auth/AuthenticationPage.jsx"
import {TradeForm} from "./trades/TradeForm.jsx"
import { TradeList } from "./trades/TradeList.jsx"
import './App.css'

function App() {
    return <ClerkProviderWithRoutes>
        <Routes>
            <Route path="/sign-in/*" element={<AuthenticationPage />} />
            <Route path="/sign-up" element={<AuthenticationPage />} />
            <Route path="/log-trade" element={<TradeForm />}/>
            <Route path="/my-trades" element={<TradeList />} />
            <Route element={<Layout />}>
                <Route path="/" element={<ChallengeGenerator />}/>
                <Route path="/history" element={<HistoryPanel />}/>
            </Route>
        </Routes>
    </ClerkProviderWithRoutes>
}

export default App