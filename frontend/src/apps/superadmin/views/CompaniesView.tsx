import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, Building2, Search, CreditCard, CheckCircle2, 
  ChevronRight, X, Users, Store, Edit2, UserPlus, Save
} from 'lucide-react';
import { apiClient } from '../../../api/client';

interface Company {
  id: string;
  name: string;
  rfc: string;
  plan: string;
  status: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
  company_id: string;
}

export default function CompaniesView() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const [formData, setFormData] = useState({
    name: '', rfc: '', plan: 'starter',
    admin_name: '', admin_email: '', admin_password: ''
  });

  const [adminModal, setAdminModal] = useState<{
    isOpen: boolean;
    companyId: string;
    userId: string | null;
    full_name: string;
    email: string;
    password: string;
  }>({ isOpen: false, companyId: '', userId: null, full_name: '', email: '', password: '' });

  const { data: companies = [], isLoading } = useQuery<Company[]>({
    queryKey: ['super-companies'],
    queryFn: async () => {
      const res = await apiClient.get('/companies');
      return res.data;
    }
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['super-all-users'],
    queryFn: async () => {
      const res = await apiClient.get('/users');
      return res.data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      // 1. Crear empresa
      const companyRes = await apiClient.post('/companies', { 
        name: data.name, rfc: data.rfc, plan: data.plan 
      });
      const company = companyRes.data;
      
      // 2. Crear admin_empresa vinculado a la empresa
      if (data.admin_email && data.admin_password) {
        await apiClient.post('/users', {
          full_name: data.admin_name || `Admin de ${data.name}`,
          email: data.admin_email,
          password: data.admin_password,
          role: 'admin_empresa',
          company_id: company.id,
          is_active: true
        });
      }
      
      return company;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-companies'] });
      setIsModalOpen(false);
      setFormData({ name: '', rfc: '', plan: 'starter', admin_name: '', admin_email: '', admin_password: '' });
    }
  });

  const saveAdminMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        full_name: data.full_name,
        email: data.email,
        role: 'admin_empresa',
        company_id: data.companyId,
        is_active: true,
        ...(data.password ? { password: data.password } : {})
      };

      if (data.userId) {
        return apiClient.put(`/users/${data.userId}`, payload);
      } else {
        if (!data.password) throw new Error("Contraseña es obligatoria para nuevos usuarios");
        return apiClient.post('/users', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-all-users'] });
      setAdminModal({ ...adminModal, isOpen: false });
    }
  });

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <div className="text-emerald-500 font-bold animate-pulse">Consultando base de datos global...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/50 p-6 rounded-[32px] border border-slate-800">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Total Clientes</p>
          <h4 className="text-3xl font-black text-white mt-1">{companies.length}</h4>
        </div>
        <div className="bg-slate-900/50 p-6 rounded-[32px] border border-slate-800">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Planes Enterprise</p>
          <h4 className="text-3xl font-black text-white mt-1">{companies.filter(c => c.plan === 'enterprise').length}</h4>
        </div>
        <div className="bg-slate-900/50 p-6 rounded-[32px] border border-slate-800">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Planes Pro</p>
          <h4 className="text-3xl font-black text-white mt-1">{companies.filter(c => c.plan === 'pro').length}</h4>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input type="text" placeholder="Buscar empresa..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-slate-900 border border-slate-800 rounded-3xl text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <button onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-3 px-8 py-4 bg-emerald-600 text-white rounded-[24px] font-black hover:bg-emerald-700 shadow-xl shadow-emerald-600/20">
          <Plus size={20} /> Registrar Empresa
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredCompanies.map((company) => (
          <div key={company.id} className="bg-slate-900/50 rounded-[40px] border border-slate-800 p-8 hover:border-emerald-500/50 transition-all group relative overflow-hidden">
            <div className="flex justify-between items-start relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-slate-800 rounded-3xl flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                  <Building2 size={32} />
                </div>
                <div>
                  <h4 className="text-xl font-black text-white">{company.name}</h4>
                  <p className="text-slate-500 text-sm font-bold uppercase">{company.rfc || 'Sin RFC'}</p>
                </div>
              </div>
              <div className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest ${
                company.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
              }`}>
                {company.status}
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4 relative z-10">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
                <CreditCard size={18} className="text-slate-500" />
                <div>
                  <p className="text-[8px] font-black text-slate-600 uppercase">Plan</p>
                  <p className="text-xs font-bold text-slate-300 uppercase">{company.plan}</p>
                </div>
              </div>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
                <CheckCircle2 size={18} className="text-emerald-500" />
                <div>
                  <p className="text-[8px] font-black text-slate-600 uppercase">Suscripcion</p>
                  <p className="text-xs font-bold text-slate-300 uppercase">Al dia</p>
                </div>
              </div>
            </div>

            {/* Administradores de la Empresa */}
            <div className="mt-6 pt-6 border-t border-slate-800 relative z-10">
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3 flex items-center gap-2">
                <Users size={14} /> Accesos de Administrador
              </p>
              <div className="space-y-2">
                {users.filter(u => u.company_id === company.id && u.role === 'admin_empresa').map(admin => (
                  <div key={admin.id} className="flex items-center justify-between bg-slate-950/50 p-3 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors group/admin">
                    <div>
                      <p className="text-sm font-bold text-white">{admin.full_name}</p>
                      <p className="text-xs text-slate-400">{admin.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-purple-500/10 text-purple-400 rounded text-[9px] font-black uppercase tracking-widest border border-purple-500/20">
                        Admin Empresa
                      </span>
                      <button 
                        onClick={() => setAdminModal({ isOpen: true, companyId: company.id, userId: admin.id, full_name: admin.full_name, email: admin.email, password: '' })}
                        className="p-2 text-slate-500 hover:text-white bg-slate-900 rounded-lg opacity-0 group-hover/admin:opacity-100 transition-all"
                        title="Editar Admin"
                      >
                        <Edit2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {users.filter(u => u.company_id === company.id && u.role === 'admin_empresa').length === 0 && (
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium text-slate-500 italic">No hay administrador asignado</div>
                    <button 
                      onClick={() => setAdminModal({ isOpen: true, companyId: company.id, userId: null, full_name: '', email: '', password: '' })}
                      className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors"
                    >
                      <UserPlus size={14} /> Añadir Admin
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all"></div>
          </div>
        ))}
      </div>

      {/* MODAL: Crear Empresa + Admin */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in zoom-in-95 duration-200">
          <div className="bg-slate-900 w-full max-w-lg rounded-[48px] shadow-2xl border border-slate-800 overflow-hidden">
            <div className="p-10 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-black text-2xl text-white">Nueva Empresa</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-3 bg-slate-800 text-slate-400 hover:text-white rounded-2xl">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-10 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Datos de la Empresa */}
              <div className="flex items-center gap-3 text-emerald-500 mb-2">
                <Building2 size={20} />
                <span className="text-xs font-black uppercase tracking-widest">Datos de la Empresa</span>
              </div>
              
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Nombre Comercial</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Grupo Gastronomico del Norte"
                  className="w-full mt-2 px-6 py-4 bg-slate-950 border border-slate-800 rounded-3xl text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-1">RFC</label>
                  <input type="text" value={formData.rfc} onChange={(e) => setFormData({...formData, rfc: e.target.value})}
                    placeholder="XAXX010101000"
                    className="w-full mt-2 px-6 py-4 bg-slate-950 border border-slate-800 rounded-3xl text-white font-bold outline-none uppercase" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Plan</label>
                  <select value={formData.plan} onChange={(e) => setFormData({...formData, plan: e.target.value})}
                    className="w-full mt-2 px-6 py-4 bg-slate-950 border border-slate-800 rounded-3xl text-white font-bold outline-none appearance-none">
                    <option value="starter">Starter (Gratis)</option>
                    <option value="pro">Pro ($29/mes)</option>
                    <option value="enterprise">Enterprise ($99/mes)</option>
                  </select>
                </div>
              </div>

              {/* Datos del Admin de la Empresa */}
              <div className="flex items-center gap-3 text-blue-500 mt-6 mb-2">
                <Users size={20} />
                <span className="text-xs font-black uppercase tracking-widest">Administrador de la Empresa</span>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Nombre del Admin</label>
                <input type="text" value={formData.admin_name} onChange={(e) => setFormData({...formData, admin_name: e.target.value})}
                  placeholder="Roberto Hernandez"
                  className="w-full mt-2 px-6 py-4 bg-slate-950 border border-slate-800 rounded-3xl text-white font-bold outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Email del Admin</label>
                  <input type="email" value={formData.admin_email} onChange={(e) => setFormData({...formData, admin_email: e.target.value})}
                    placeholder="admin@empresa.com"
                    className="w-full mt-2 px-6 py-4 bg-slate-950 border border-slate-800 rounded-3xl text-white font-bold outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Password del Admin</label>
                  <input type="password" value={formData.admin_password} onChange={(e) => setFormData({...formData, admin_password: e.target.value})}
                    className="w-full mt-2 px-6 py-4 bg-slate-950 border border-slate-800 rounded-3xl text-white font-bold outline-none" />
                </div>
              </div>
            </div>

            <div className="p-10 bg-slate-950/50 flex gap-4">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 font-bold text-slate-500">Cancelar</button>
              <button 
                onClick={() => createMutation.mutate(formData)}
                disabled={!formData.name || createMutation.isPending}
                className="flex-1 py-4 bg-emerald-600 text-white rounded-3xl font-black shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-50"
              >
                {createMutation.isPending ? 'Procesando...' : 'Activar Empresa + Admin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Gestionar Admin */}
      {adminModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in zoom-in-95 duration-200">
          <div className="bg-slate-900 w-full max-w-md rounded-[48px] shadow-2xl border border-slate-800 overflow-hidden">
            <div className="p-8 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-black text-xl text-white">
                {adminModal.userId ? 'Editar Administrador' : 'Nuevo Administrador'}
              </h3>
              <button onClick={() => setAdminModal({...adminModal, isOpen: false})} className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-xl">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Nombre Completo</label>
                <input type="text" value={adminModal.full_name} onChange={(e) => setAdminModal({...adminModal, full_name: e.target.value})}
                  className="w-full mt-2 px-5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Correo Electrónico</label>
                <input type="email" value={adminModal.email} onChange={(e) => setAdminModal({...adminModal, email: e.target.value})}
                  className="w-full mt-2 px-5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Contraseña {adminModal.userId && '(Opcional)'}</label>
                <input type="password" value={adminModal.password} onChange={(e) => setAdminModal({...adminModal, password: e.target.value})}
                  placeholder={adminModal.userId ? 'Dejar en blanco para no cambiar' : 'Requerida'}
                  className="w-full mt-2 px-5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>

            <div className="p-8 border-t border-slate-800 bg-slate-950 flex justify-end gap-4">
              <button onClick={() => setAdminModal({...adminModal, isOpen: false})} className="px-6 py-3 text-slate-400 font-bold hover:text-white">
                Cancelar
              </button>
              <button 
                onClick={() => saveAdminMutation.mutate(adminModal)} 
                disabled={saveAdminMutation.isPending || !adminModal.full_name || !adminModal.email || (!adminModal.userId && !adminModal.password)}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 disabled:opacity-50"
              >
                <Save size={18} /> {saveAdminMutation.isPending ? 'Guardando...' : 'Guardar Admin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
