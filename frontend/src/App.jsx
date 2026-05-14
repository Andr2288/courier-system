import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import SiteHeader from './components/SiteHeader.jsx';
import { RequireAuth, SessionProvider } from './context/SessionContext.jsx';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import TrackingPage from './pages/TrackingPage.jsx';
import PanelLayout from './panel/PanelLayout.jsx';
import ClientsPage from './panel/ClientsPage.jsx';
import CouriersPage from './panel/CouriersPage.jsx';
import PanelHome from './panel/PanelHome.jsx';
import ShipmentsPage from './panel/ShipmentsPage.jsx';
import TariffsPage from './panel/TariffsPage.jsx';
import AnalyticsPage from './panel/AnalyticsPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <div className="min-h-screen">
          <SiteHeader />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<RequireAuth />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/track" element={<TrackingPage />} />
              <Route path="/panel" element={<PanelLayout />}>
                <Route index element={<PanelHome />} />
                <Route path="clients" element={<ClientsPage />} />
                <Route path="couriers" element={<CouriersPage />} />
                <Route path="shipments" element={<ShipmentsPage />} />
                <Route path="tariffs" element={<TariffsPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </SessionProvider>
    </BrowserRouter>
  );
}
