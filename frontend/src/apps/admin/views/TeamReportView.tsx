import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  Trophy, 
  Star, 
  Clock,
  Briefcase
} from 'lucide-react';
import { apiClient } from '../../../api/client';

export default function TeamReportView() {
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

  const { data: team, isLoading } = useQuery({
    queryKey: ['admin-team-performance', restaurantId],
    queryFn: async () => {
      const res = await apiClient.get('/reports/waiters', { params: { restaurant_id: restaurantId } });
      return res.data;
    },
    enabled: !!restaurantId
  });

  if (!restaurantId) return <div className="p-20 text-center text-rose-500 font-bold">Sesión inválida.</div>;
  if (isLoading) return <div className="p-20 text-center text-slate-400 font-bold animate-pulse">Analizando desempeño del equipo...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-3xl text-white shadow-xl shadow-blue-600/20">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-white/20 rounded-2xl">
              <Trophy size={24} />
            </div>
            <div className="px-2 py-1 bg-white/20 rounded-lg text-[10px] font-bold">TOP MESERO</div>
          </div>
          <h3 className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-1">Mejor Rendimiento</h3>
          <p className="text-2xl font-black">{team?.[0]?.waiter_name || 'Sin datos'}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl w-fit mb-4">
            <Users size={24} />
          </div>
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Total Plantilla</h3>
          <p className="text-2xl font-black text-slate-800 dark:text-white">{team?.length || 0} Meseros</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="p-3 bg-purple-500/10 text-purple-500 rounded-2xl w-fit mb-4">
            <Clock size={24} />
          </div>
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Actividad Reciente</h3>
          <p className="text-2xl font-black text-slate-800 dark:text-white">Conectado <span className="text-sm text-slate-400">Hoy</span></p>
        </div>
      </div>

      {/* Tabla de Desempeño */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Briefcase className="text-blue-500" size={20} /> Escalafón de Desempeño por Ventas
          </h3>
        </div>
        <div className="overflow-x-auto">
          {team && team.length > 0 ? (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase font-black tracking-widest text-slate-500 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-6 py-4">Mesero</th>
                  <th className="px-6 py-4">Ventas Totales</th>
                  <th className="px-6 py-4 text-center">Comandas Cerradas</th>
                  <th className="px-6 py-4">Ranking</th>
                  <th className="px-6 py-4 text-right">Progreso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {team.map((member: any, i: number) => (
                  <tr key={i} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                          {member.waiter_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-white">{member.waiter_name}</p>
                          <p className="text-[10px] text-slate-500 font-medium">Restaurante Activo</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-black text-slate-700 dark:text-slate-200">${member.total_sales.toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs font-bold text-slate-500">{member.orders_count}</span>
                    </td>
                    <td className="px-6 py-4">
                      {i === 0 ? (
                        <span className="flex items-center gap-1 text-amber-500 text-xs font-black">
                          <Star size={14} fill="currentColor" /> Legendario
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-slate-400">Regular</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="w-32 ml-auto bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-blue-600 h-full rounded-full" 
                          style={{ width: `${Math.min(100, (member.total_sales / (team[0].total_sales || 1)) * 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-20 text-center text-slate-400 italic">No hay actividad de equipo registrada.</div>
          )}
        </div>
      </div>

    </div>
  );
}
