import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Store, Plus, Search, MapPin, Phone, Edit2, Shield, Trash2, X, AlertTriangle 
} from 'lucide-react';
import { apiClient } from '../../../api/client';

interface Restaurant {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  status: string;
  company_id: string;
}

export default function BranchesManagementView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Restaurant | null>(null);
  
  const [formData, setFormData] = useState({
    name: '', address: '', phone: ''
  });

  const token = localStorage.getItem('access_token');
  let companyId = '';
  let userRole = '';
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      companyId = payload.company_id;
      userRole = payload.role;
    } catch (e) { console.error(e); }
  }

  // Fetch Restaurants
  const { data: branches = [], isLoading } = useQuery<Restaurant[]>({
    queryKey: ['admin-branches', companyId],
    queryFn: async () => {
      const res = await apiClient.get('/restaurants', { params: { company_id: companyId } });
      return res.data;
    },
    enabled: !!companyId
  });

  // Create or Update Restaurant
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingBranch) {
        return apiClient.put(`/restaurants/${editingBranch.id}`, data);
      }
      return apiClient.post('/restaurants', { ...data, company_id: companyId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-branches'] });
      closeModal();
    }
  });

  const openModal = (branch?: Restaurant) => {
    if (branch) {
      setEditingBranch(branch);
      setFormData({ name: branch.name, address: branch.address || '', phone: branch.phone || '' });
    } else {
      setEditingBranch(null);
      setFormData({ name: '', address: '', phone: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBranch(null);
    setFormData({ name: '', address: '', phone: '' });
  };

  const filteredBranches = branches.filter(b => 
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  // Solo admin_empresa y superadmin pueden crear/editar sucursales
  const canManage = ['superadmin', 'admin_empresa'].includes(userRole);

  if (isLoading) return <div className="p-20 text-center font-bold text-slate-400 animate-pulse">Cargando sucursales...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input 
            type="text" 
            placeholder="Buscar sucursal..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-800 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" 
          />
        </div>
        
        {canManage ? (
          <button 
            onClick={() => openModal()}
            className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 shadow-xl shadow-blue-600/20 active:scale-95 transition-all"
          >
            <Plus size={20} /> Añadir Sucursal
          </button>
        ) : (
          <div className="px-6 py-3 bg-amber-50 text-amber-600 rounded-2xl flex items-center gap-2 text-sm font-bold border border-amber-200">
            <AlertTriangle size={18} /> Solo el Administrador de Empresa puede añadir sucursales
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBranches.map(branch => (
          <div key={branch.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-lg transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
              {canManage && (
                <button onClick={() => openModal(branch)} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors">
                  <Edit2 size={16} />
                </button>
              )}
            </div>
            
            <div className="w-14 h-14 bg-blue-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6 group-hover:scale-110 transition-transform">
              <Store size={28} />
            </div>
            
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">{branch.name}</h3>
            
            <div className="space-y-3 mt-6">
              <div className="flex items-start gap-3 text-sm font-medium text-slate-500 dark:text-slate-400">
                <MapPin size={16} className="mt-0.5 shrink-0" />
                <span className="leading-snug">{branch.address || 'Sin dirección registrada'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm font-medium text-slate-500 dark:text-slate-400">
                <Phone size={16} className="shrink-0" />
                <span>{branch.phone || 'Sin teléfono'}</span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                branch.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}>
                {branch.status === 'active' ? 'Operativa' : 'Inactiva'}
              </div>
              <span className="text-[10px] font-mono text-slate-400">ID: {branch.id.substring(0,8)}</span>
            </div>
          </div>
        ))}

        {filteredBranches.length === 0 && (
          <div className="col-span-full py-20 text-center text-slate-400">
            <Store size={64} className="mx-auto opacity-20 mb-4" />
            <p className="text-xl font-bold">No se encontraron sucursales</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-black text-xl text-slate-800 dark:text-white">
                {editingBranch ? 'Editar Sucursal' : 'Nueva Sucursal'}
              </h3>
              <button onClick={closeModal} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nombre Comercial</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Ej: Sucursal Centro"
                  className="w-full mt-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold border-none outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Dirección Completa</label>
                <textarea 
                  value={formData.address} 
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  placeholder="Calle, Número, Colonia..."
                  className="w-full mt-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold border-none outline-none focus:ring-2 focus:ring-blue-500 resize-none h-24" 
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Teléfono</label>
                <input 
                  type="text" 
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  placeholder="+52 961 000 0000"
                  className="w-full mt-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold border-none outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
              <button onClick={closeModal} className="flex-1 py-3 font-bold text-slate-500 hover:text-slate-700">Cancelar</button>
              <button 
                onClick={() => saveMutation.mutate(formData)}
                disabled={!formData.name || saveMutation.isPending}
                className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-black shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-50 transition-all"
              >
                {saveMutation.isPending ? 'Guardando...' : 'Guardar Sucursal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
