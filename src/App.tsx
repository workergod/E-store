import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuth } from './features/auth/hooks/useAuth';
import { ProtectedRoute } from './shared/layouts/ProtectedRoute';
import { PublicRoute } from './shared/layouts/PublicRoute';
import LoginPage from './features/auth/pages/LoginPage';
import AccessDeniedPage from './features/auth/pages/AccessDeniedPage';
import SetupPage from './features/auth/pages/SetupPage';
// ...

// Master Data Pages
import DashboardPage from './features/dashboard/pages/DashboardPage';
import CategoriesPage from './features/masterData/pages/CategoriesPage';
import BrandsPage from './features/masterData/pages/BrandsPage';
import UnitsPage from './features/masterData/pages/UnitsPage';
import ProductTypesPage from './features/masterData/pages/ProductTypesPage';
import ManufacturersPage from './features/masterData/pages/ManufacturersPage';
import RackLocationsPage from './features/masterData/pages/RackLocationsPage';
import ProductTemplatesPage from './features/masterData/pages/ProductTemplatesPage';

// Inventory Pages
import ProductsPage from './features/products/pages/ProductsPage';
import ProductDetailsPage from './features/products/pages/ProductDetailsPage';
import SuppliersPage from './features/suppliers/pages/SuppliersPage';
import PurchaseOrdersPage from './features/purchases/pages/PurchaseOrdersPage';
import PurchaseOrderForm from './features/purchases/pages/PurchaseOrderForm';
import PurchaseOrderDetails from './features/purchases/pages/PurchaseOrderDetails';
import StockDashboard from './features/stock/pages/StockDashboard';
import StockAdjustmentsPage from './features/stock/pages/StockAdjustmentsPage';
import StockAdjustmentForm from './features/stock/pages/StockAdjustmentForm';
import EmployeeDashboard from './features/employees/pages/EmployeeDashboard';
import EmployeeForm from './features/employees/pages/EmployeeForm';
import EmployeeProfile from './features/employees/pages/EmployeeProfile';
import IssueMaterialsPage from './features/inventory/pages/IssueMaterialsPage';
import ReturnMaterialsPage from './features/inventory/pages/ReturnMaterialsPage';

import TransactionLogPage from './features/reports/pages/TransactionLogPage';
import SettingsPage from './features/settings/pages/SettingsPage';
import HelpPage from './features/settings/pages/HelpPage';
import KnowledgeBasePage from './features/settings/pages/KnowledgeBasePage';

import { AppShell } from './shared/layouts/AppShell';
import { Toaster } from 'sonner';

function MainApp() {
  useAuth(); // Hook to initialize and listen to Firebase auth

  return (
    <Routes>
      {/* Public / Auth Routes */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/setup" element={<PublicRoute><SetupPage /></PublicRoute>} />
      
      {/* Semi-Public Error Route */}
      <Route path="/access-denied" element={<AccessDeniedPage />} />

      {/* Protected App Routes */}
      <Route path="*" element={
        <ProtectedRoute>
          <AppShell>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              
              {/* Master Data Routes */}
              <Route path="/master-data/categories" element={<CategoriesPage />} />
              <Route path="/master-data/brands" element={<BrandsPage />} />
              <Route path="/master-data/units" element={<UnitsPage />} />
              <Route path="/master-data/product-types" element={<ProductTypesPage />} />
              <Route path="/master-data/manufacturers" element={<ManufacturersPage />} />
              <Route path="/master-data/rack-locations" element={<RackLocationsPage />} />
              <Route path="/master-data/templates" element={<ProductTemplatesPage />} />

              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/:id" element={<ProductDetailsPage />} />
              <Route path="/suppliers" element={<SuppliersPage />} />
              <Route path="/purchases" element={<PurchaseOrdersPage />} />
              <Route path="/purchases/new" element={<PurchaseOrderForm />} />
              <Route path="/purchases/edit/:id" element={<PurchaseOrderForm />} />
              <Route path="/purchases/:id" element={<PurchaseOrderDetails />} />
              <Route path="/stock" element={<StockDashboard />} />
              <Route path="/stock/adjustments" element={<StockAdjustmentsPage />} />
              <Route path="/stock/adjustments/new" element={<StockAdjustmentForm />} />
              <Route path="/stock/adjustments/:id" element={<StockAdjustmentForm />} />
              
              <Route path="/employees" element={<EmployeeDashboard />} />
              <Route path="/employees/new" element={<EmployeeForm />} />
              <Route path="/employees/edit/:id" element={<EmployeeForm />} />
              <Route path="/employees/:id" element={<EmployeeProfile />} />

              <Route path="/issue" element={<IssueMaterialsPage />} />
              <Route path="/returns" element={<ReturnMaterialsPage />} />

              <Route path="/transaction-log" element={<TransactionLogPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/help" element={<HelpPage />} />
              <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
            </Routes>
          </AppShell>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <MainApp />
    </BrowserRouter>
  );
}
