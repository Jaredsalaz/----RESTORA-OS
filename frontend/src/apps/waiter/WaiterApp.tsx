import { Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { LayoutGrid, UtensilsCrossed, ClipboardList, LogOut } from 'lucide-react';
import TablesView from './views/TablesView';
import MenuView from './views/MenuView';
import OrderSidebar from './views/OrderSidebar';
import HistoryView from './views/HistoryView';
import LoginView from './views/LoginView';

export default function WaiterApp() {
  const location = useLocation();
  const token = localStorage.getItem('access_token');

  // Si no hay token y no está en la página de login, redirigir
  if (!token && !location.pathname.endsWith('/login')) {
    return <Navigate to="login" replace />;
  }

  // Si está en login, solo renderizar la vista de login (sin menús laterales)
  if (location.pathname.endsWith('/login')) {
    return (
      <Routes>
        <Route path="login" element={<LoginView />} />
        <Route path="*" element={<Navigate to="login" replace />} />
      </Routes>
    );
  }

  // Determinar si estamos en la vista de historial (no mostrar sidebar de comanda)
  const isHistoryView = location.pathname.includes('/history');

  return (
    <div className="h-screen w-full bg-slate-50 dark:bg-slate-950 flex overflow-hidden">
      
      {/* Sidebar de navegación rápida */}
      <aside className="w-24 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col items-center py-8 shrink-0 z-20">
        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-blue-500/30 mb-8">
          R
        </div>
        
        <nav className="flex flex-col gap-4 w-full px-4">
          <NavLink 
            to="/waiter/tables"
            className={({ isActive }) => `
              w-full aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-300
              ${isActive 
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 shadow-inner' 
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}
            `}
          >
            <LayoutGrid size={24} strokeWidth={2} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Mesas</span>
          </NavLink>

          <NavLink 
            to="/waiter/menu"
            className={({ isActive }) => `
              w-full aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-300
              ${isActive 
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 shadow-inner' 
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}
            `}
          >
            <UtensilsCrossed size={24} strokeWidth={2} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Menú</span>
          </NavLink>

          <NavLink 
            to="/waiter/history"
            className={({ isActive }) => `
              w-full aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-300
              ${isActive 
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 shadow-inner' 
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}
            `}
          >
            <ClipboardList size={24} strokeWidth={2} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Historial</span>
          </NavLink>
        </nav>

        {/* Logout Button */}
        <div className="mt-auto px-4 w-full">
          <button 
            onClick={() => {
              localStorage.removeItem('access_token');
              window.location.href = '/waiter/login';
            }}
            className="w-full aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-300 text-rose-400 hover:text-rose-600 hover:bg-rose-50"
          >
            <LogOut size={24} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Salir</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        <Routes>
          <Route path="/" element={<Navigate to="tables" replace />} />
          <Route path="tables" element={<TablesView />} />
          <Route path="menu" element={<MenuView />} />
          <Route path="history" element={<HistoryView />} />
        </Routes>
      </main>

      {/* Persistent Order Sidebar (Solo visible cuando no es historial) */}
      {!isHistoryView && <OrderSidebar />}
      
    </div>
  );
}
