import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CreateTripPage from './pages/CreateTripPage';
import TripsPage from './pages/TripsPage';
import UsersPage from './pages/UsersPage';
import MasterDataPage from './pages/MasterDataPage';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" toastOptions={{ className: 'toast-custom', duration: 3000 }} />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<DashboardPage />} />
              <Route path="create-trip" element={<CreateTripPage />} />
              <Route path="edit-trip/:id" element={<CreateTripPage />} />
              <Route path="trips" element={<TripsPage />} />
              <Route path="master-data" element={<ProtectedRoute adminOnly><MasterDataPage /></ProtectedRoute>} />
              <Route path="users" element={<ProtectedRoute adminOnly><UsersPage /></ProtectedRoute>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
