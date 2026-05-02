import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  ShoppingCart, 
  ArrowUpRight,
  Trophy,
  BarChart3
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell
} from 'recharts';
import { apiClient } from '../../../api/client';

export default function DashboardView() {
  // Extraer restaurantId del token de forma dinámica
  const token = localStorage.getItem('access_token');
  let restaurantId = '';
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      restaurantId = payload.restaurant_id || localStorage.getItem('admin_selected_restaurant_id') || '';
    } catch (e) {
      console.error('Error decoding token', e);
    }
  }

  // Query para estadísticas generales
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['admin-dashboard-stats', restaurantId],
    queryFn: async () => {
      const res = await apiClient.get('/reports/dashboard', { params: { restaurant_id: restaurantId } });
      return res.data;
    },
    enabled: !!restaurantId
  });

  // Query para historial semanal
  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ['admin-sales-history', restaurantId],
    queryFn: async () => {
      const res = await apiClient.get('/reports/sales/history', { params: { restaurant_id: restaurantId, days: 7 } });
      return res.data;
    },
    enabled: !!restaurantId
  });

  if (!restaurantId) {
    return <div className="flex items-center justify-center h-64 text-rose-500 font-bold">Error: Sesión inválida. Reingresa al sistema.</div>;
  }

  if (loadingStats || loadingHistory) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 font-bold animate-pulse">Consultando datos reales...</p>
      </div>
    );
  }

  const kpis = [
    { 
      label: 'Ventas de Hoy', 
      value: `$${stats.today_revenue.toLocaleString()}`, 
      growth: `${stats.revenue_growth}%`, 
      isPositive: stats.revenue_growth >= 0, 
      icon: DollarSign, 
      color: 'blue' 
    },
    { 
      label: 'Comandas Hoy', 
      value: stats.today_orders, 
      growth: stats.today_orders > 0 ? '+100%' : '0%', 
      isPositive: stats.today_orders > 0, 
      icon: ShoppingCart, 
      color: 'emerald' 
    },
    { 
      label: 'Ticket Promedio', 
      value: `$${stats.avg_ticket.toFixed(2)}`, 
      growth: '0%', 
      isPositive: true, 
      icon: TrendingUp, 
      color: 'purple' 
    },
    { 
      label: 'Clientes Hoy', 
      value: stats.customers_today, 
      growth: 'Real', 
      isPositive: true, 
      icon: Users, 
      color: 'orange' 
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Grid de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl bg-${kpi.color}-500/10 text-${kpi.color}-500`}>
                <kpi.icon size={24} />
              </div>
              <div className={`flex items-center gap-1 text-xs font-bold ${kpi.isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                {kpi.isPositive ? <ArrowUpRight size={14} /> : <TrendingDown size={14} />}
                {kpi.growth}
              </div>
            </div>
            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{kpi.label}</h3>
            <p className="text-2xl font-black text-slate-800 dark:text-white">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Gráfica de Ventas Semanales */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <BarChart3 className="text-blue-500" size={20} /> Ventas de la Semana
            </h3>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Datos en Tiempo Real</span>
          </div>
          
          <div className="h-[300px] w-full">
            {history.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }}
                    tickFormatter={(val) => val.split('-').slice(1).join('/')}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }}
                    tickFormatter={(val) => `$${val}`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#f1f5f9' }}
                  />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                    {history.map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={index === history.length - 1 ? '#2563eb' : '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 font-medium italic">
                No hay ventas registradas en los últimos 7 días.
              </div>
            )}
          </div>
        </div>

        {/* Top Productos Side Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <Trophy className="text-amber-500" size={20} /> Top 5 Productos
          </h3>
          <div className="space-y-6">
            {stats.top_products.length > 0 ? (
              stats.top_products.map((prod: any, i: number) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-black text-slate-500">
                    #{i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{prod.name}</p>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">{prod.quantity} unidades vendidas</p>
                  </div>
                  <div className="text-emerald-500">
                    <ArrowUpRight size={16} />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center text-slate-400 text-sm italic">
                Aún no hay datos de ventas.
              </div>
            )}
          </div>
          
          <button className="w-full mt-8 py-3 text-sm font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 transition-colors">
            Ver Reporte Completo
          </button>
        </div>

      </div>

      {/* Meseros Ranking */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
          <Users className="text-purple-500" size={20} /> Desempeño del Equipo (Hoy)
        </h3>
        {stats.waiter_ranking.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stats.waiter_ranking.map((waiter: any, i: number) => (
              <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-lg">
                  {waiter.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{waiter.name}</p>
                  <p className="text-xs text-slate-500 font-medium">${waiter.total.toLocaleString()} generados</p>
                </div>
                <div className="ml-auto">
                   <div className="text-[10px] font-black px-2 py-1 bg-emerald-100 text-emerald-600 rounded-full">TOP</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center text-slate-400 text-sm italic">
            No hay actividad de meseros hoy.
          </div>
        )}
      </div>

    </div>
  );
}
