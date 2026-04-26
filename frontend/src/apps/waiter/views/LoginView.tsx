import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Delete, ChefHat, UtensilsCrossed } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';

type RoleMode = 'waiter' | 'kitchen';

export default function LoginView() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [restaurantId, setRestaurantId] = useState('');
  const [roleMode, setRoleMode] = useState<RoleMode>('waiter');
  const navigate = useNavigate();

  const { data: restaurants = [], isLoading: loadingRestaurants } = useQuery({
    queryKey: ['restaurants'],
    queryFn: async () => {
      const response = await apiClient.get('/restaurants');
      return response.data;
    }
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
      
      // Decodificar JWT para verificar el rol
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
    } catch (err) {
      setError('PIN incorrecto. Vuelve a intentarlo.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const isWaiter = roleMode === 'waiter';
  const accentColor = isWaiter ? 'blue' : 'blue';

  return (
    <div className="h-screen w-full bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm flex flex-col items-center relative overflow-hidden">
        
        {/* Barra superior */}
        <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>

        {/* Icono */}
        <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-5 shadow-inner">
          {isWaiter ? <UtensilsCrossed size={36} strokeWidth={2.5} /> : <ChefHat size={36} strokeWidth={2.5} />}
        </div>
        
        <h1 className="text-3xl font-black text-slate-800 mb-1">Restora OS</h1>
        
        {/* Toggle Mesero / Cocina */}
        <div className="w-full flex bg-slate-100 rounded-xl p-1 mb-4">
          <button
            onClick={() => { setRoleMode('waiter'); setPin(''); setError(''); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              isWaiter ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <UtensilsCrossed size={16} /> Mesero
          </button>
          <button
            onClick={() => { setRoleMode('kitchen'); setPin(''); setError(''); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              !isWaiter ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ChefHat size={16} /> Cocina
          </button>
        </div>

        {/* Selector de Restaurante */}
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

        <p className="text-slate-500 mb-6 font-medium text-sm">
          Ingresa tu PIN de {isWaiter ? 'Mesero' : 'Cocina'}
        </p>
        
        {/* Display del PIN */}
        <div className="flex gap-4 mb-6">
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

        {/* Mensaje de error */}
        <div className="h-6 mb-4">
          {error && <p className="text-rose-500 text-sm font-bold animate-pulse">{error}</p>}
        </div>

        {/* Teclado Numérico */}
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

      </div>
    </div>
  );
}
