import ClerkProviderWithRoutes from "./auth/ClerkProviderWithRoutes.jsx"
import {Routes, Route} from "react-router-dom"
import {Layout} from "./layout/Layout.jsx"
import {AuthenticationPage} from "./auth/AuthenticationPage.jsx"
import {TradeForm} from "./trades/TradeForm.jsx"
import { TradeList } from "./trades/TradeList.jsx"
import {EditTradeForm} from "./trades/EditTradeForm"
import {TradeDetail} from "./trades/TradeDetail.jsx"
import './App.css'

function App() {
    return <ClerkProviderWithRoutes>
        <Routes>
            <Route path="/sign-in/*" element={<AuthenticationPage />} />
            <Route path="/sign-up" element={<AuthenticationPage />} />
            <Route element={<Layout />}>
                <Route path="/" element={<TradeList />}/>
                <Route path="/log-trade" element={<TradeForm />}/>
                <Route path="/my-trades" element={<TradeList />} />
                <Route path="/trade/:id" element={<TradeDetail />} />
                <Route path="/edit-trade/:tradeId" element={<EditTradeForm />} />
            </Route>
        </Routes>
    </ClerkProviderWithRoutes>
}

export default App