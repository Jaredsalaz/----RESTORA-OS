import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import WaiterApp from './apps/waiter/WaiterApp';
import KitchenWrapper from './apps/kitchen/KitchenWrapper';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/waiter" replace />} />
        <Route path="/waiter/*" element={<WaiterApp />} />
        <Route path="/kitchen" element={<KitchenWrapper />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
