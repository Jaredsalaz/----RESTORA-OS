import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Settings2, 
  Layout, 
  Trash2,
  Move,
  QrCode,
  Layers,
  ChevronRight,
  X,
  Save
} from 'lucide-react';
import { apiClient } from '../../../api/client';

type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning';

interface Table {
  id: string;
  name: string;
  status: TableStatus;
  capacity: number;
  section?: string;
  position_x?: number;
  position_y?: number;
}

export default function TablesManagementView() {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState('Interior');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTable, setNewTable] = useState({ name: '', capacity: 4, section: 'Interior' });

  // 1. Obtener restaurantId dinámicamente
  const token = localStorage.getItem('access_token');
  let restaurantId = '';
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      restaurantId = payload.restaurant_id || localStorage.getItem('admin_selected_restaurant_id') || '';
    } catch (e) { console.error(e); }
  }

  // 2. Query para obtener mesas reales
  const { data: tables = [], isLoading } = useQuery<Table[]>({
    queryKey: ['admin-tables', restaurantId],
    queryFn: async () => {
      const res = await apiClient.get('/tables', { params: { restaurant_id: restaurantId } });
      return res.data;
    },
    enabled: !!restaurantId
  });

  // 3. Mutation para crear mesa
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post('/tables', data, { params: { restaurant_id: restaurantId } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tables'] });
      setIsModalOpen(false);
      setNewTable({ name: '', capacity: 4, section: activeSection });
    }
  });

  // 4. Mutation para eliminar mesa
  const deleteMutation = useMutation({
    mutationFn: async (tableId: string) => {
      return apiClient.delete(`/tables/${tableId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tables'] });
    }
  });

  const sections = ['Interior', 'Terraza', 'Bar', 'Privado'];

  const getStatusColor = (status: TableStatus) => {
    switch (status) {
      case 'available': return 'bg-emerald-500';
      case 'occupied': return 'bg-rose-500';
      case 'reserved': return 'bg-amber-500';
      case 'cleaning': return 'bg-blue-500';
      default: return 'bg-slate-500';
    }
  };

  if (isLoading) return <div className="p-20 text-center animate-pulse font-bold text-slate-400">Cargando mapa de mesas...</div>;

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500">
      
      {/* Header y Filtros */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
          {sections.map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${
                activeSection === section 
                ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {section}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                  onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> Nueva Mesa
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Mapa Interactivo con DATOS REALES */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-[40px] border-4 border-slate-100 dark:border-slate-800 relative overflow-hidden shadow-inner min-h-[500px]">
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" 
               style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
          
          <div className="relative p-10 grid grid-cols-2 md:grid-cols-4 gap-10">
            {tables.filter(t => (t.section || 'Interior') === activeSection).map((table) => (
              <div key={table.id} className="group relative">
                <div className={`
                  aspect-square rounded-3xl flex flex-col items-center justify-center gap-1 transition-all
                  hover:scale-105 shadow-xl ${getStatusColor(table.status)} text-white
                `}>
                  <span className="text-3xl font-black">{table.name}</span>
                  <div className="flex items-center gap-1 mt-1 opacity-80">
                    <Layout size={10} />
                    <span className="text-[10px] font-bold">{table.capacity} pax</span>
                  </div>
                </div>
                
                {/* Controles de CRUD */}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-900 text-white p-1 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
                  <button className="p-2 hover:bg-rose-500/50 rounded-lg text-rose-400"
                          onClick={() => { if(confirm('¿Borrar mesa?')) deleteMutation.mutate(table.id) }}>
                    <Trash2 size={14} />
                  </button>
                  <button className="p-2 hover:bg-white/10 rounded-lg"><QrCode size={14} /></button>
                </div>
              </div>
            ))}

            {tables.filter(t => (t.section || 'Interior') === activeSection).length === 0 && (
                <div className="col-span-full py-20 text-center text-slate-400 italic">
                    No hay mesas en la sección {activeSection}. ¡Crea una nueva!
                </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Layers size={18} className="text-blue-500" /> Resumen {activeSection}
            </h3>
            <div className="space-y-4">
               <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Mesas Totales</p>
                  <p className="text-xl font-black text-slate-800 dark:text-white">
                    {tables.filter(t => (t.section || 'Interior') === activeSection).length}
                  </p>
               </div>
            </div>
          </div>
        </aside>
      </div>

      {/* MODAL PARA NUEVA MESA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-black text-xl text-slate-800 dark:text-white">Nueva Mesa</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nombre / Número</label>
                <input 
                  type="text" 
                  value={newTable.name}
                  onChange={(e) => setNewTable({...newTable, name: e.target.value})}
                  placeholder="Ej: Mesa 12 o VIP 1"
                  className="w-full mt-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none ring-2 ring-transparent focus:ring-blue-500 transition-all font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Capacidad (pax)</label>
                  <input 
                    type="number" 
                    value={newTable.capacity}
                    onChange={(e) => setNewTable({...newTable, capacity: parseInt(e.target.value)})}
                    className="w-full mt-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none ring-2 ring-transparent focus:ring-blue-500 transition-all font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Sección</label>
                  <select 
                    value={newTable.section}
                    onChange={(e) => setNewTable({...newTable, section: e.target.value})}
                    className="w-full mt-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none ring-2 ring-transparent focus:ring-blue-500 transition-all font-bold"
                  >
                    {sections.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 font-bold text-slate-500 hover:text-slate-700 transition-colors">Cancelar</button>
              <button 
                onClick={() => createMutation.mutate(newTable)}
                disabled={!newTable.name || createMutation.isPending}
                className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {createMutation.isPending ? 'Guardando...' : <><Save size={18} /> Guardar Mesa</>}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
