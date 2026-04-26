import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useOrderStore } from '../store/useOrderStore';
import { apiClient } from '../../../api/client';

export default function TablesView() {
  const navigate = useNavigate();
  const setTable = useOrderStore(state => state.setTable);
  const loadExistingOrder = useOrderStore(state => state.loadExistingOrder);
  const clearOrder = useOrderStore(state => state.clearOrder);
  
  const { data: tables = [], isLoading } = useQuery({
    queryKey: ['tables'],
    queryFn: async () => {
      const response = await apiClient.get('/tables');
      return response.data;
    }
  });

  const handleTableClick = async (table: any) => {
    // Primero limpiar cualquier orden previa del store
    clearOrder();
    
    // Setear la mesa seleccionada
    setTable(String(table.id), table.name);

    if (table.status === 'occupied') {
      // Mesa ocupada → cargar la comanda activa existente
      await loadExistingOrder(String(table.id));
    }

    // Navegar al menú para agregar items
    navigate('/waiter/menu');
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500 font-bold text-xl">Cargando mesas del restaurante...</div>;
  }

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Mapa del Salón</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Selecciona una mesa para abrir comanda</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div><span className="text-sm font-medium text-slate-600 dark:text-slate-300">Libre</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500"></div><span className="text-sm font-medium text-slate-600 dark:text-slate-300">Ocupada (agregar)</span></div>
        </div>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
        {tables.map((table: any) => (
          <div 
            key={table.id} 
            onClick={() => handleTableClick(table)}
            className={`aspect-square rounded-3xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 shadow-sm border-2
              ${table.status === 'available' 
                ? 'bg-white dark:bg-slate-800 border-emerald-100 dark:border-emerald-900/30 hover:border-emerald-500 hover:shadow-emerald-500/20' 
                : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 hover:border-amber-500 hover:shadow-amber-500/20'
              }`}
          >
            <div className={`text-xl xl:text-2xl font-black mb-1 text-center leading-tight break-words px-2 ${table.status === 'available' ? 'text-slate-700 dark:text-slate-200' : 'text-amber-700 dark:text-amber-400'}`}>
              {table.name}
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {table.capacity} PAX
            </span>
            {table.status === 'occupied' && (
              <span className="mt-2 text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-600 px-2 py-0.5 rounded-full">
                + Agregar items
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
