import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { 
  LayoutDashboard, 
  BarChart3, 
  Users, 
  Settings, 
  LogOut, 
  PieChart,
  CalendarDays,
  Layout,
  Users2,
  Store
} from 'lucide-react';
import DashboardView from './views/DashboardView';
import SalesReportView from './views/SalesReportView';
import TeamReportView from './views/TeamReportView';
import MenuManagementView from './views/MenuManagementView';
import TablesManagementView from './views/TablesManagementView';
import UsersManagementView from './views/UsersManagementView';
import ConfigView from './views/ConfigView';
import BranchesManagementView from './views/BranchesManagementView';

export default function AdminApp() {
  const location = useLocation();
  const token = localStorage.getItem('access_token');

  // Redirigir si no hay token (simulado)
  if (!token && !location.pathname.endsWith('/login')) {
    return <Navigate to="/waiter/login" replace />; 
  }

  let role = '';
  let companyId = '';
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      role = payload.role;
      companyId = payload.company_id;
    } catch (e) { console.error(e); }
  }

  const [selectedBranch, setSelectedBranch] = useState(localStorage.getItem('admin_selected_restaurant_id') || '');

  const { data: restaurants = [] } = useQuery({
    queryKey: ['admin-app-branches', companyId],
    queryFn: async () => {
      const res = await apiClient.get('/restaurants', { params: { company_id: companyId } });
      return res.data;
    },
    enabled: !!companyId && role === 'admin_empresa'
  });

  useEffect(() => {
    if (role === 'admin_empresa' && !selectedBranch && restaurants.length > 0) {
      setSelectedBranch(restaurants[0].id);
      localStorage.setItem('admin_selected_restaurant_id', restaurants[0].id);
      window.dispatchEvent(new Event('storage')); // Notificar a las vistas
    }
  }, [restaurants, role, selectedBranch]);

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedBranch(newId);
    localStorage.setItem('admin_selected_restaurant_id', newId);
    window.dispatchEvent(new Event('storage')); // Forzar re-render de vistas si escuchan
    window.location.reload(); // Recarga rápida para que las vistas tomen el nuevo ID
  };

  const navItems = [
    { to: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: 'sales', icon: BarChart3, label: 'Ventas' },
    { to: 'team', icon: Users, label: 'Equipo' },
    { to: 'users', icon: Users2, label: 'Usuarios' },
    { to: 'tables', icon: Layout, label: 'Mesas' },
    { to: 'menu', icon: PieChart, label: 'Menú' },
    { to: 'branches', icon: Store, label: 'Sucursales' },
    { to: 'config', icon: Settings, label: 'Configuración' },
  ];

  return (
    <div className="h-screen w-full bg-slate-50 dark:bg-slate-950 flex overflow-hidden">
      
      {/* Sidebar Administrativo */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20">
            R
          </div>
          <div>
            <h1 className="text-white font-bold text-sm tracking-tight">Restora OS</h1>
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Admin Panel</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={`/admin/${item.to}`}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                ${isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'}
              `}
            >
              <item.icon size={20} />
              <span className="font-semibold text-sm">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer Sidebar */}
        <div className="p-4 mt-auto border-t border-slate-800">
          <button 
            onClick={() => {
              localStorage.removeItem('access_token');
              window.location.href = '/waiter/login';
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-all"
          >
            <LogOut size={20} />
            <span className="font-bold text-sm">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative overflow-y-auto bg-slate-50 dark:bg-slate-950 p-8">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white">
              {navItems.find(item => location.pathname.includes(item.to))?.label || 'Dashboard'}
            </h2>
            <p className="text-slate-500 text-sm font-medium">Panel Administrativo de Restora OS</p>
          </div>
          
          <div className="flex items-center gap-4">
            {role === 'admin_empresa' && (
              <select 
                value={selectedBranch}
                onChange={handleBranchChange}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold px-4 py-2 rounded-xl outline-none"
              >
                {restaurants.map((r: any) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            )}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-400">
              <CalendarDays size={18} className="text-blue-500" />
              {new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-full border-2 border-white dark:border-slate-900 shadow-md"></div>
          </div>
        </header>

        <Routes>
          <Route path="/" element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardView />} />
          <Route path="sales" element={<SalesReportView />} />
          <Route path="team" element={<TeamReportView />} />
          <Route path="users" element={<UsersManagementView />} />
          <Route path="tables" element={<TablesManagementView />} />
          <Route path="menu" element={<MenuManagementView />} />
          <Route path="branches" element={<BranchesManagementView />} />
          <Route path="config" element={<ConfigView />} />
          <Route path="*" element={<div className="p-20 text-center text-slate-400 font-bold italic">Módulo bajo mantenimiento...</div>} />
        </Routes>
      </main>
    </div>
  );
}
