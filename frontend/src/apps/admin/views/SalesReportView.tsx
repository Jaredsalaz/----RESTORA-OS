import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Calendar, 
  Download, 
  Filter, 
  Clock, 
  TrendingUp,
  Receipt
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { apiClient } from '../../../api/client';

export default function SalesReportView() {
  // Obtener restaurantId dinámicamente del token
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

  const [days, setDays] = useState<number>(30);

  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ['admin-sales-history-full', restaurantId, days],
    queryFn: async () => {
      const res = await apiClient.get('/reports/sales/history', { params: { restaurant_id: restaurantId, days } });
      return res.data;
    },
    enabled: !!restaurantId
  });

  const { data: hourly, isLoading: loadingHourly } = useQuery({
    queryKey: ['admin-sales-hourly', restaurantId],
    queryFn: async () => {
      const res = await apiClient.get('/reports/hourly', { params: { restaurant_id: restaurantId } });
      return res.data;
    },
    enabled: !!restaurantId
  });

  if (!restaurantId) return <div className="p-20 text-center text-rose-500 font-bold">Sesión inválida. Reingresa.</div>;
  if (loadingHistory || loadingHourly) return <div className="p-20 text-center text-slate-400 font-bold animate-pulse">Consultando base de datos en tiempo real...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Filtros y Acciones */}
      <div className="flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select 
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="pl-10 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold outline-none ring-1 ring-slate-200 dark:ring-slate-700 appearance-none cursor-pointer"
            >
              <option value={7}>Últimos 7 días</option>
              <option value={15}>Últimos 15 días</option>
              <option value={30}>Últimos 30 días</option>
              <option value={90}>Últimos 3 meses</option>
            </select>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors">
            <Filter size={16} /> Filtros Avanzados
          </button>
        </div>
        
        <button className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all">
          <Download size={16} /> Exportar Reporte
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Análisis de Horas Pico */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
          <div className="mb-6">
            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Clock className="text-orange-500" size={20} /> Distribución Horaria (Horas Pico)
            </h3>
            <p className="text-xs text-slate-400 font-medium">Análisis de actividad por hora del día</p>
          </div>
          
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourly}>
                <defs>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} />
                <YAxis hide />
                <Tooltip />
                <Area type="monotone" dataKey="orders" stroke="#f59e0b" fillOpacity={1} fill="url(#colorOrders)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tendencia de Ingresos */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
          <div className="mb-6">
            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <TrendingUp className="text-emerald-500" size={20} /> Tendencia de Ingresos (30d)
            </h3>
            <p className="text-xs text-slate-400 font-medium">Evolución de ventas totales mensuales</p>
          </div>
          
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" hide />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Tabla de Detalle Diario */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Receipt className="text-blue-500" size={20} /> Desglose Diario de Operaciones
          </h3>
          <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-1 rounded-md uppercase tracking-widest">Base de Datos OK</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase font-black tracking-widest text-slate-500 border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4 text-center">Órdenes</th>
                <th className="px-6 py-4">Ticket Prom.</th>
                <th className="px-6 py-4">Ingresos Brutos</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {history?.map((day: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300 text-sm">{day.date}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-black">
                      {day.orders}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-400 text-sm">
                    ${(day.revenue / day.orders || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 font-black text-slate-800 dark:text-white text-sm">
                    ${day.revenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-[10px] font-black text-blue-600 hover:underline uppercase">Ver detalle</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
