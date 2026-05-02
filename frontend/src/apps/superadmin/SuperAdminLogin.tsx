import { useState } from 'react';
import { ShieldCheck, Lock, Mail, AlertTriangle, Loader2 } from 'lucide-react';
import { apiClient } from '../../api/client';

export default function SuperAdminLogin({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post('/auth/login', { email, password });
      const { access_token, role } = res.data;

      if (role !== 'superadmin') {
        setError('Acceso denegado. Esta terminal es exclusiva para administradores del sistema.');
        setLoading(false);
        return;
      }

      localStorage.setItem('access_token', access_token);
      onLogin();
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Credenciales invalidas');
    }
    setLoading(false);
  };

  return (
    <div className="h-screen w-full bg-slate-950 flex items-center justify-center relative overflow-hidden">
      {/* Fondo animado */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/20 mb-6">
            <ShieldCheck size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Restora OS</h1>
          <p className="text-emerald-500 text-[10px] uppercase font-bold tracking-[0.3em] mt-2">Terminal de Control Global</p>
        </div>

        {/* Form */}
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-[40px] border border-slate-800 p-10 space-y-6">
          {error && (
            <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-sm font-bold">
              <AlertTriangle size={18} />
              {error}
            </div>
          )}

          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Identificacion</label>
            <div className="relative mt-2">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@restora.com"
                className="w-full pl-14 pr-6 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Clave Maestra</label>
            <div className="relative mt-2">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="*************"
                className="w-full pl-14 pr-6 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading || !email || !password}
            className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-lg shadow-2xl shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
          >
            {loading ? <Loader2 className="animate-spin" size={24} /> : 'Acceder al Sistema'}
          </button>
        </div>

        <p className="text-center text-slate-700 text-[10px] font-bold mt-8 tracking-widest">
          RESTORA OS v2.0 | INFRAESTRUCTURA PROTEGIDA
        </p>
      </div>
    </div>
  );
}
