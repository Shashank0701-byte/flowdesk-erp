import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { PageSpinner } from './components/ui/Spinner';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CustomersPage from './pages/customers/CustomersPage';
import CustomerDetailPage from './pages/customers/CustomerDetailPage';
import ProductsPage from './pages/products/ProductsPage';
import ProductDetailPage from './pages/products/ProductDetailPage';
import ChallansPage from './pages/challans/ChallansPage';
import ChallanDetailPage from './pages/challans/ChallanDetailPage';
import ChallanFormPage from './pages/challans/ChallanFormPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  if (loading) return <PageSpinner />;
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  if (loading) return <PageSpinner />;
  if (token) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={<PublicRoute><LoginPage /></PublicRoute>}
      />
      <Route
        path="/"
        element={<PrivateRoute><DashboardPage /></PrivateRoute>}
      />
      <Route
        path="/customers"
        element={<PrivateRoute><CustomersPage /></PrivateRoute>}
      />
      <Route
        path="/customers/:id"
        element={<PrivateRoute><CustomerDetailPage /></PrivateRoute>}
      />
      <Route
        path="/products"
        element={<PrivateRoute><ProductsPage /></PrivateRoute>}
      />
      <Route
        path="/products/:id"
        element={<PrivateRoute><ProductDetailPage /></PrivateRoute>}
      />
      <Route
        path="/challans"
        element={<PrivateRoute><ChallansPage /></PrivateRoute>}
      />
      <Route
        path="/challans/new"
        element={<PrivateRoute><ChallanFormPage /></PrivateRoute>}
      />
      <Route
        path="/challans/:id"
        element={<PrivateRoute><ChallanDetailPage /></PrivateRoute>}
      />
      <Route
        path="/challans/:id/edit"
        element={<PrivateRoute><ChallanFormPage /></PrivateRoute>}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
