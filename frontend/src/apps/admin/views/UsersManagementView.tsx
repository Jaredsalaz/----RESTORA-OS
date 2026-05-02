import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, UserPlus, Trash2, Mail, Lock, Key, X, Save, 
  User as UserIcon, Briefcase, Edit2, Power, Loader2
} from 'lucide-react';
import { apiClient } from '../../../api/client';

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  restaurant_id: string;
}

export default function UsersManagementView() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [search, setSearch] = useState('');
  
  const [formData, setFormData] = useState({
    full_name: '', email: '', password: '', role: 'mesero', pin_code: '', is_active: true
  });

  const token = localStorage.getItem('access_token');
  let tokenRestaurantId = '';
  let myRole = '';
  let companyId = '';
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      tokenRestaurantId = payload.restaurant_id || localStorage.getItem('admin_selected_restaurant_id') || '';
      myRole = payload.role;
      companyId = payload.company_id;
    } catch (e) { console.error(e); }
  }

  const [selectedRestaurantId, setSelectedRestaurantId] = useState(tokenRestaurantId);

  // Obtener sucursales si soy admin_empresa
  const { data: restaurants = [] } = useQuery({
    queryKey: ['admin-branches-dropdown', companyId],
    queryFn: async () => {
      const res = await apiClient.get('/restaurants', { params: { company_id: companyId } });
      return res.data;
    },
    enabled: !!companyId && myRole === 'admin_empresa'
  });

  // Si soy admin_empresa y los restaurantes cargaron, seleccionar el primero por defecto
  if (myRole === 'admin_empresa' && !selectedRestaurantId && restaurants.length > 0) {
    setSelectedRestaurantId(restaurants[0].id);
  }

  // Roles que puedo crear segun mi jerarquia
  const creatableRoles: Record<string, { value: string; label: string }[]> = {
    superadmin: [
      { value: 'admin_empresa', label: 'Admin Empresa' },
      { value: 'gerente', label: 'Gerente' },
      { value: 'cajero', label: 'Cajero' },
      { value: 'mesero', label: 'Mesero' },
      { value: 'cocina', label: 'Cocina' },
    ],
    admin_empresa: [
      { value: 'gerente', label: 'Gerente' },
      { value: 'cajero', label: 'Cajero' },
      { value: 'mesero', label: 'Mesero' },
      { value: 'cocina', label: 'Cocina' },
    ],
    gerente: [
      { value: 'cajero', label: 'Cajero' },
      { value: 'mesero', label: 'Mesero' },
      { value: 'cocina', label: 'Cocina' },
    ],
  };

  const availableRoles = creatableRoles[myRole] || creatableRoles['gerente'];

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['admin-users', selectedRestaurantId],
    queryFn: async () => {
      const res = await apiClient.get('/users', { params: { restaurant_id: selectedRestaurantId } });
      return res.data;
    },
    enabled: !!selectedRestaurantId
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingUser) {
        return apiClient.put(`/users/${editingUser.id}`, data);
      }
      return apiClient.post('/users', { ...data, restaurant_id: selectedRestaurantId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      closeModal();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] })
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => apiClient.patch(`/users/${id}/toggle`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] })
  });

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name,
      email: user.email,
      password: '',
      role: user.role,
      pin_code: '',
      is_active: user.is_active
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData({ full_name: '', email: '', password: '', role: 'mesero', pin_code: '', is_active: true });
  };

  const getRoleBadge = (role: string) => {
    const map: Record<string, { label: string; color: string }> = {
      admin_empresa: { label: 'Admin', color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30' },
      gerente: { label: 'Gerente', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' },
      cajero: { label: 'Cajero', color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' },
      mesero: { label: 'Mesero', color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' },
      cocina: { label: 'Cocina', color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30' },
    };
    const info = map[role] || { label: role, color: 'bg-slate-100 text-slate-600' };
    return <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${info.color}`}>{info.label}</span>;
  };

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <div className="p-20 text-center animate-pulse text-slate-400 font-bold italic">Cargando equipo...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Buscar por nombre o correo..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none text-sm font-medium focus:ring-2 focus:ring-blue-500" />
        </div>

        {myRole === 'admin_empresa' && (
          <div className="flex-1 w-full max-w-xs">
            <select 
              value={selectedRestaurantId} 
              onChange={(e) => setSelectedRestaurantId(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-slate-800 dark:text-white text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecciona una sucursal</option>
              {restaurants.map((r: any) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        )}

        <button onClick={() => { setEditingUser(null); setFormData({ full_name: '', email: '', password: '', role: availableRoles[0]?.value || 'mesero', pin_code: '', is_active: true }); setIsModalOpen(true); }}
          disabled={!selectedRestaurantId}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-600/20 disabled:opacity-50">
          <UserPlus size={18} /> Nuevo Usuario
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Empleado</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Rol</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Estado</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                      <UserIcon size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800 dark:text-white">{user.full_name}</p>
                      <p className="text-xs text-slate-400">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                <td className="px-6 py-4">
                  <button onClick={() => toggleMutation.mutate(user.id)} className="flex items-center gap-2 group/toggle">
                    <div className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                    <span className="text-[10px] font-bold text-slate-500 group-hover/toggle:text-blue-500">{user.is_active ? 'Activo' : 'Inactivo'}</span>
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditModal(user)} className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => { if(confirm('Eliminar este usuario?')) deleteMutation.mutate(user.id) }}
                      className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && <div className="p-20 text-center text-slate-400 italic">No se encontraron usuarios.</div>}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="font-black text-xl text-slate-800 dark:text-white">{editingUser ? 'Editar Usuario' : 'Nuevo Empleado'}</h3>
              <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nombre Completo</label>
                <div className="relative mt-1">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} placeholder="Juan Perez" className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Correo Electronico</label>
                <div className="relative mt-1">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="correo@restora.com" className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">{editingUser ? 'Nueva Password (opcional)' : 'Password'}</label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">PIN Tactil</label>
                  <div className="relative mt-1">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" maxLength={6} value={formData.pin_code} onChange={(e) => setFormData({...formData, pin_code: e.target.value})} placeholder="1234" className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold text-blue-600" />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Rol</label>
                <div className="relative mt-1">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold appearance-none">
                    {availableRoles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
              <button onClick={closeModal} className="flex-1 py-3 font-bold text-slate-500">Cancelar</button>
              <button 
                onClick={() => createMutation.mutate(formData)}
                disabled={!formData.email || (!editingUser && !formData.password) || createMutation.isPending}
                className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-black shadow-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {createMutation.isPending ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> {editingUser ? 'Actualizar' : 'Crear'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
