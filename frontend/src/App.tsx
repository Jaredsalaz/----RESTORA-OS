import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import WaiterApp from './apps/waiter/WaiterApp';
import KitchenWrapper from './apps/kitchen/KitchenWrapper';
import AdminApp from './apps/admin/AdminApp';
import SuperAdminApp from './apps/superadmin/SuperAdminApp';

import CashierApp from './apps/cashier/CashierApp';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/waiter" replace />} />
        <Route path="/waiter/*" element={<WaiterApp />} />
        <Route path="/kitchen" element={<KitchenWrapper />} />
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="/super-admin/*" element={<SuperAdminApp />} />
        <Route path="/cashier/*" element={<CashierApp />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
