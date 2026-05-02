import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { 
  ShieldCheck, 
  Building2, 
  CreditCard, 
  LogOut, 
  BarChart, 
  Settings,
  Users
} from 'lucide-react';
import SuperAdminLogin from './SuperAdminLogin';
import GlobalDashboardView from './views/GlobalDashboardView';
import CompaniesView from './views/CompaniesView';

export default function SuperAdminApp() {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Verificar si hay token de superadmin
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role === 'superadmin') {
          setIsAuthenticated(true);
        }
      } catch (e) {
        setIsAuthenticated(false);
      }
    }
  }, []);

  // Guard: Si no es superadmin, mostrar login secreto
  if (!isAuthenticated) {
    return <SuperAdminLogin onLogin={() => setIsAuthenticated(true)} />;
  }

  const navItems = [
    { to: 'dashboard', icon: BarChart, label: 'Global Dashboard' },
    { to: 'companies', icon: Building2, label: 'Empresas SaaS' },
    { to: 'subscriptions', icon: CreditCard, label: 'Suscripciones' },
    { to: 'settings', icon: Settings, label: 'Configuracion' },
  ];

  return (
    <div className="h-screen w-full bg-slate-900 flex overflow-hidden font-sans">
      
      {/* Sidebar */}
      <aside className="w-72 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-8 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h1 className="text-white font-black text-lg tracking-tight">Super Admin</h1>
            <p className="text-emerald-500 text-[10px] uppercase font-bold tracking-[0.2em]">Restora Global</p>
          </div>
        </div>

        <nav className="flex-1 px-6 py-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={`/super-admin/${item.to}`}
              className={({ isActive }) => `
                flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 group
                ${isActive 
                  ? 'bg-emerald-600 text-white shadow-2xl shadow-emerald-600/30 translate-x-2' 
                  : 'text-slate-500 hover:text-white hover:bg-slate-800/50'}
              `}
            >
              <item.icon size={22} className={location.pathname.includes(item.to) ? 'scale-110' : 'group-hover:scale-110 transition-transform'} />
              <span className="font-bold text-sm">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-6 mt-auto border-t border-slate-800">
          <button 
            onClick={() => {
              localStorage.removeItem('access_token');
              setIsAuthenticated(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-4 text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all font-bold"
          >
            <LogOut size={22} />
            <span>Salir del Sistema</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative overflow-y-auto bg-slate-950 p-10">
        <header className="mb-12 flex justify-between items-center">
            <div>
                <h2 className="text-4xl font-black text-white tracking-tight">
                    {navItems.find(item => location.pathname.includes(item.to))?.label || 'Global Overview'}
                </h2>
                <p className="text-slate-500 font-medium mt-1">Control maestro de la infraestructura Restora OS</p>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="bg-slate-900 border border-slate-800 px-6 py-3 rounded-2xl flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-sm font-bold text-slate-300">Sistemas Estables</span>
                </div>
            </div>
        </header>

        <Routes>
          <Route path="/" element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<GlobalDashboardView />} />
          <Route path="companies" element={<CompaniesView />} />
          <Route path="subscriptions" element={
            <div className="bg-slate-900/50 rounded-[32px] border border-slate-800 p-10">
              <h3 className="text-xl font-black text-white mb-4">Planes Disponibles</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { name: 'Starter', price: 'Gratis', features: ['1 sucursal', '5 usuarios', 'Reportes basicos'] },
                  { name: 'Pro', price: '$29/mes', features: ['3 sucursales', '20 usuarios', 'Reportes avanzados', 'Soporte prioritario'] },
                  { name: 'Enterprise', price: '$99/mes', features: ['Ilimitado', 'API access', 'White-label', 'Soporte 24/7'] },
                ].map((plan, i) => (
                  <div key={i} className={`rounded-3xl p-8 border ${i === 2 ? 'bg-emerald-600/10 border-emerald-500/30' : 'bg-slate-950 border-slate-800'}`}>
                    <h4 className="text-lg font-black text-white">{plan.name}</h4>
                    <p className="text-2xl font-black text-emerald-500 mt-2">{plan.price}</p>
                    <ul className="mt-4 space-y-2">
                      {plan.features.map((f, j) => (
                        <li key={j} className="text-sm text-slate-400 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          } />
          <Route path="settings" element={<div className="text-slate-500 italic">Configuracion global del sistema...</div>} />
        </Routes>
      </main>
    </div>
  );
}
