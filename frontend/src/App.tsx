// hello this is vishal project
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import FollowUps from './pages/FollowUps';
import CustomerDetail from './pages/CustomerDetail';
import Branches from './pages/Branches';
import Customers from './pages/Customers';
import Measurements from './pages/Measurements';
import Calendar from './pages/Calendar';
import Enquiries from './pages/Enquiries';
import Communications from './pages/Communications';
import Quotations from './pages/Quotations';
import Orders from './pages/Orders';
import Payments from './pages/Payments';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import StockRequests from './pages/StockRequests';
import PurchaseOrders from './pages/PurchaseOrders';
import GoodsReceipts from './pages/GoodsReceipts';
import Tailoring from './pages/Tailoring';
import QualityControl from './pages/QualityControl';
import Packing from './pages/Packing';
import Installations from './pages/Installations';
import Resizing from './pages/Resizing';
import FieldEmployees from './pages/FieldEmployees';
import Vehicles from './pages/Vehicles';
import Users from './pages/Users';
import Permissions from './pages/Permissions';
import Notifications from './pages/Notifications';
import AuditLogs from './pages/AuditLogs';
import ActivityLogs from './pages/ActivityLogs';
import DocumentSettings from './pages/DocumentSettings';
import CommunicationSettings from './pages/CommunicationSettings';
import IntegrationSettings from './pages/IntegrationSettings';
import SystemSettings from './pages/SystemSettings';
import { Button } from './components/ui';
import { useNavigate } from 'react-router-dom';

function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <p className="text-6xl font-bold text-slate-200">404</p>
      <p className="text-slate-500">That page doesn't exist in FurnishOps.</p>
      <Button onClick={() => navigate('/dashboard')}>Back to dashboard</Button>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/follow-ups" element={<FollowUps />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/customers/:id" element={<CustomerDetail />} />
        <Route path="/measurements" element={<Measurements />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/branches" element={<Branches />} />
        <Route path="/enquiries" element={<Enquiries />} />
        <Route path="/communications" element={<Communications />} />
        <Route path="/quotations" element={<Quotations />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/products" element={<Products />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/stock-requests" element={<StockRequests />} />
        <Route path="/purchase-orders" element={<PurchaseOrders />} />
        <Route path="/goods-receipts" element={<GoodsReceipts />} />
        <Route path="/tailoring" element={<Tailoring />} />
        <Route path="/qc" element={<QualityControl />} />
        <Route path="/packing" element={<Packing />} />
        <Route path="/installations" element={<Installations />} />
        <Route path="/resizing" element={<Resizing />} />
        <Route path="/field-employees" element={<FieldEmployees />} />
        <Route path="/vehicles" element={<Vehicles />} />
        <Route path="/users" element={<Users />} />
        <Route path="/permissions" element={<Permissions />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/audit-logs" element={<AuditLogs />} />
        <Route path="/activity-logs" element={<ActivityLogs />} />
        <Route path="/document-settings" element={<DocumentSettings />} />
        <Route path="/communication-settings" element={<CommunicationSettings />} />
        <Route path="/integration-settings" element={<IntegrationSettings />} />
        <Route path="/system-settings" element={<SystemSettings />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}