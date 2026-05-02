import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Delete, ChefHat, UtensilsCrossed, UserCog, Mail, Key, Building2, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';

type RoleMode = 'waiter' | 'kitchen' | 'manager';

export default function LoginView() {
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [restaurantId, setRestaurantId] = useState('');
  const [roleMode, setRoleMode] = useState<RoleMode>('waiter');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const companySlug = searchParams.get('c');
  const [slugInput, setSlugInput] = useState('');

  const { data: restaurants = [], isLoading: loadingRestaurants, error: restaurantsError } = useQuery({
    queryKey: ['restaurants', companySlug],
    queryFn: async () => {
      if (!companySlug) return [];
      const response = await apiClient.get('/auth/restaurants', { params: { company_slug: companySlug } });
      return response.data;
    },
    enabled: !!companySlug,
    retry: false
  });

  useEffect(() => {
    if (restaurants.length > 0 && !restaurantId) {
      setRestaurantId(restaurants[0].id);
    }
  }, [restaurants]);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      if (roleMode === 'manager') {
        if (!email || !password) {
          setError('Ingresa correo y contraseña');
          setLoading(false);
          return;
        }

        const res = await apiClient.post('/auth/login', {
          email: email,
          password: password
        });

        const token = res.data.access_token;
        localStorage.setItem('access_token', token);
        
        // El backend devuelve el rol, verifiquemos si es admin_empresa o gerente
        if (res.data.role !== 'admin_empresa' && res.data.role !== 'gerente' && res.data.role !== 'admin' && res.data.role !== 'manager') {
          setError('No tienes permisos de administrador');
          localStorage.removeItem('access_token');
          setLoading(false);
          return;
        }

        window.location.href = '/admin/dashboard';
        return;
      }

      // Login por PIN (Mesero / Cocina)
      if (!restaurantId) {
        setError('Selecciona un restaurante');
        setLoading(false);
        return;
      }
      
      const res = await apiClient.post('/auth/login-pin', {
        pin: pin,
        restaurant_id: restaurantId
      });
      
      const token = res.data.access_token;
      localStorage.setItem('access_token', token);
      
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        if (roleMode === 'kitchen' && payload.role !== 'kitchen') {
          setError('Este PIN no es de cocina');
          setPin('');
          setLoading(false);
          localStorage.removeItem('access_token');
          return;
        }
        
        if (roleMode === 'waiter' && payload.role === 'kitchen') {
          setError('Este PIN es de cocina, selecciona "Cocina"');
          setPin('');
          setLoading(false);
          localStorage.removeItem('access_token');
          return;
        }
        
        if (payload.role === 'kitchen') {
          localStorage.setItem('kitchen_token', token);
          window.location.href = '/kitchen';
          return;
        }
      } catch {}
      
      navigate('/waiter/tables');
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError(roleMode === 'manager' ? 'Credenciales inválidas' : 'PIN incorrecto');
      } else {
        setError('Error al conectar con el servidor');
      }
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const isManager = roleMode === 'manager';
  const isWaiter = roleMode === 'waiter';

  if (!companySlug) {
    return (
      <div className="h-screen w-full bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-[40px] p-10 max-w-md w-full shadow-2xl text-center space-y-8">
          <div className="w-20 h-20 bg-blue-100 rounded-3xl flex items-center justify-center mx-auto text-blue-500 mb-4">
            <Building2 size={40} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800">Tu Espacio de Trabajo</h1>
            <p className="text-slate-500 mt-2 font-medium">Ingresa el identificador de tu empresa para acceder al sistema.</p>
          </div>
          <div>
            <input 
              type="text" 
              placeholder="ejemplo: grupo-moctezuma"
              value={slugInput}
              onChange={(e) => setSlugInput(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              onKeyDown={(e) => e.key === 'Enter' && slugInput && setSearchParams({ c: slugInput })}
              className="w-full text-center text-xl py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none focus:border-blue-500 focus:bg-white font-bold transition-all"
            />
          </div>
          <button 
            onClick={() => slugInput && setSearchParams({ c: slugInput })}
            disabled={!slugInput}
            className="w-full py-4 bg-blue-500 text-white rounded-2xl font-black text-lg hover:bg-blue-600 disabled:opacity-50 transition-all shadow-xl shadow-blue-500/20"
          >
            Continuar
          </button>
        </div>
      </div>
    );
  }

  if (restaurantsError) {
    return (
      <div className="h-screen w-full bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-[40px] p-10 max-w-md w-full shadow-2xl text-center space-y-6">
          <div className="text-rose-500 mx-auto w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-800">Empresa no encontrada</h2>
          <p className="text-slate-500">No encontramos ninguna empresa con el identificador "{companySlug}". Verifica que esté bien escrito.</p>
          <button onClick={() => setSearchParams({})} className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200">
            Volver a intentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm flex flex-col items-center relative overflow-hidden">
        
        {/* Barra superior */}
        <div className={`absolute top-0 left-0 w-full h-2 ${isManager ? 'bg-indigo-600' : 'bg-blue-600'}`}></div>

        {/* Icono dinámico */}
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-5 shadow-inner ${
          isManager ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-600'
        }`}>
          {roleMode === 'waiter' && <UtensilsCrossed size={36} strokeWidth={2.5} />}
          {roleMode === 'kitchen' && <ChefHat size={36} strokeWidth={2.5} />}
          {roleMode === 'manager' && <UserCog size={36} strokeWidth={2.5} />}
        </div>
        
        <h1 className="text-3xl font-black text-slate-800 mb-1">Restora OS</h1>
        
        {/* Toggle Roles */}
        <div className="w-full flex bg-slate-100 rounded-xl p-1 mb-4 overflow-x-auto no-scrollbar">
          <button
            onClick={() => { setRoleMode('waiter'); setPin(''); setError(''); }}
            className={`flex-1 py-2 rounded-lg text-[12px] font-bold transition-all flex items-center justify-center gap-1 min-w-[80px] ${
              roleMode === 'waiter' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <UtensilsCrossed size={14} /> Mesero
          </button>
          <button
            onClick={() => { setRoleMode('kitchen'); setPin(''); setError(''); }}
            className={`flex-1 py-2 rounded-lg text-[12px] font-bold transition-all flex items-center justify-center gap-1 min-w-[80px] ${
              roleMode === 'kitchen' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ChefHat size={14} /> Cocina
          </button>
          <button
            onClick={() => { setRoleMode('manager'); setError(''); }}
            className={`flex-1 py-2 rounded-lg text-[12px] font-bold transition-all flex items-center justify-center gap-1 min-w-[80px] ${
              roleMode === 'manager' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <UserCog size={14} /> Gerente
          </button>
        </div>

        {isManager ? (
          /* LOGIN GERENTE (Email/Password) */
          <div className="w-full space-y-4 mb-6">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
              />
            </div>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
              />
            </div>
          </div>
        ) : (
          /* LOGIN PERSONAL (PIN) */
          <>
            <div className="w-full mb-4">
              <select 
                value={restaurantId}
                onChange={(e) => setRestaurantId(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {loadingRestaurants ? (
                  <option>Cargando sucursales...</option>
                ) : (
                  restaurants.map((r: any) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))
                )}
              </select>
            </div>

            <p className="text-slate-500 mb-6 font-medium text-sm text-center">
              Ingresa tu PIN de {roleMode === 'waiter' ? 'Mesero' : 'Cocina'}
            </p>
            
            <div className="flex gap-4 mb-6 justify-center">
              {[0, 1, 2, 3].map((index) => (
                <div 
                  key={index} 
                  className={`w-12 h-14 rounded-xl flex items-center justify-center text-3xl font-black transition-all
                    ${pin.length > index ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40 scale-110' : 'bg-slate-100 text-slate-300'}`}
                >
                  {pin.length > index ? '•' : ''}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Mensaje de error */}
        <div className="h-6 mb-4 w-full text-center">
          {error && <p className="text-rose-500 text-sm font-bold animate-pulse">{error}</p>}
        </div>

        {isManager ? (
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-500/30 active:scale-[0.98]"
          >
            {loading ? 'Iniciando sesión...' : 'Entrar al Panel'}
          </button>
        ) : (
          /* Teclado Numérico para PIN */
          <div className="grid grid-cols-3 gap-3 w-full">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button 
                key={num}
                disabled={loading}
                onClick={() => pin.length < 4 && setPin(prev => prev + num)}
                className="h-16 bg-slate-50 hover:bg-slate-100 text-slate-800 text-2xl font-bold rounded-2xl transition-all active:scale-95 active:bg-slate-200"
              >
                {num}
              </button>
            ))}
            <button 
              disabled={loading}
              onClick={() => setPin(prev => prev.slice(0, -1))}
              className="h-16 bg-rose-50 hover:bg-rose-100 text-rose-500 flex items-center justify-center font-bold rounded-2xl transition-all active:scale-95"
            >
              <Delete size={24} />
            </button>
            <button 
              disabled={loading}
              onClick={() => pin.length < 4 && setPin(prev => prev + '0')}
              className="h-16 bg-slate-50 hover:bg-slate-100 text-slate-800 text-2xl font-bold rounded-2xl transition-all active:scale-95 active:bg-slate-200"
            >
              0
            </button>
            <button 
              disabled={pin.length < 4 || loading}
              onClick={handleLogin}
              className="h-16 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xl font-bold rounded-2xl transition-all active:scale-95 shadow-lg shadow-blue-500/30 disabled:shadow-none"
            >
              {loading ? '...' : 'OK'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
