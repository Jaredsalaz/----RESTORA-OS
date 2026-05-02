import { useQuery } from '@tanstack/react-query';
import { Building2, Users, Store, DollarSign, TrendingUp, Server } from 'lucide-react';
import { apiClient } from '../../../api/client';

export default function GlobalDashboardView() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['global-stats'],
    queryFn: async () => {
      const res = await apiClient.get('/global-stats');
      return res.data;
    }
  });

  if (isLoading) return <div className="text-emerald-500 animate-pulse font-bold">Sincronizando con infraestructura global...</div>;

  const kpis = [
    { label: 'Empresas Activas', value: stats?.total_companies || 0, icon: Building2, color: 'emerald' },
    { label: 'Sucursales Totales', value: stats?.total_restaurants || 0, icon: Store, color: 'blue' },
    { label: 'Usuarios Activos', value: stats?.total_users || 0, icon: Users, color: 'violet' },
    { label: 'Revenue Total', value: `$${(stats?.total_revenue || 0).toLocaleString()}`, icon: DollarSign, color: 'amber' },
  ];

  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    violet: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
    amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-slate-900/50 rounded-[32px] border border-slate-800 p-8 hover:border-slate-700 transition-all group">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${colorMap[kpi.color]} mb-4 group-hover:scale-110 transition-transform`}>
              <kpi.icon size={24} />
            </div>
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{kpi.label}</p>
            <h3 className="text-3xl font-black text-white mt-1">{kpi.value}</h3>
          </div>
        ))}
      </div>

      {/* Estado del Sistema */}
      <div className="bg-slate-900/50 rounded-[32px] border border-slate-800 p-8">
        <h3 className="text-lg font-black text-white mb-6 flex items-center gap-3">
          <Server size={20} className="text-emerald-500" />
          Estado de la Infraestructura
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: 'API Backend', status: 'online', latency: '12ms' },
            { name: 'Base de Datos', status: 'online', latency: '3ms' },
            { name: 'WebSockets', status: 'online', latency: '1ms' },
          ].map((service, i) => (
            <div key={i} className="bg-slate-950 rounded-2xl p-5 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-sm font-bold text-slate-300">{service.name}</span>
              </div>
              <span className="text-[10px] font-black text-emerald-500 uppercase">{service.latency}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actividad Reciente placeholder */}
      <div className="bg-slate-900/50 rounded-[32px] border border-slate-800 p-8">
        <h3 className="text-lg font-black text-white mb-4 flex items-center gap-3">
          <TrendingUp size={20} className="text-blue-500" />
          Resumen de la Plataforma
        </h3>
        <p className="text-slate-500 text-sm">
          La plataforma Restora OS gestiona <span className="text-white font-bold">{stats?.total_companies || 0} empresas</span> con un total de <span className="text-white font-bold">{stats?.total_restaurants || 0} sucursales</span> activas 
          y <span className="text-white font-bold">{stats?.total_users || 0} usuarios</span> operativos. 
          Revenue acumulado: <span className="text-emerald-500 font-bold">${(stats?.total_revenue || 0).toLocaleString()} MXN</span>.
        </p>
      </div>
    </div>
  );
}
