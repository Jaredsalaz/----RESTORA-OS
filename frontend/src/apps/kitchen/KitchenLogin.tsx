import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { ChefHat, Delete } from 'lucide-react';

interface KitchenLoginProps {
  onLogin: (token: string, restaurantId: string) => void;
}

export default function KitchenLogin({ onLogin }: KitchenLoginProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [restaurantId, setRestaurantId] = useState('');

  const { data: restaurants = [], isLoading: loadingRestaurants } = useQuery({
    queryKey: ['restaurants'],
    queryFn: async () => { const r = await apiClient.get('/restaurants'); return r.data; },
  });

  useEffect(() => {
    if (restaurants.length > 0 && !restaurantId) setRestaurantId(restaurants[0].id);
  }, [restaurants]);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post('/auth/login-pin', { restaurant_id: restaurantId, pin });
      const { access_token } = res.data;
      const payload = JSON.parse(atob(access_token.split('.')[1]));
      if (payload.role !== 'kitchen') {
        setError('Solo personal de cocina puede acceder');
        setPin('');
        setLoading(false);
        return;
      }
      localStorage.setItem('kitchen_token', access_token);
      localStorage.setItem('access_token', access_token);
      onLogin(access_token, payload.restaurant_id);
    } catch {
      setError('PIN incorrecto. Intenta de nuevo.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm flex flex-col items-center relative overflow-hidden">
        
        {/* Barra superior naranja (cocina) */}
        <div className="absolute top-0 left-0 w-full h-2 bg-orange-500"></div>

        <div className="w-20 h-20 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
          <ChefHat size={36} strokeWidth={2.5} />
        </div>
        
        <h1 className="text-3xl font-black text-slate-800 mb-1">Restora OS</h1>
        
        {/* Selector de Restaurante */}
        <div className="w-full mb-4">
          <select value={restaurantId} onChange={(e) => setRestaurantId(e.target.value)}
            className="w-full p-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer">
            {loadingRestaurants ? (
              <option>Cargando sucursales...</option>
            ) : (
              restaurants.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)
            )}
          </select>
        </div>

        <p className="text-slate-500 mb-6 font-medium text-sm">Ingresa el PIN de Cocina</p>
        
        {/* PIN Display */}
        <div className="flex gap-4 mb-6">
          {[0,1,2,3].map(i => (
            <div key={i} className={`w-12 h-14 rounded-xl flex items-center justify-center text-3xl font-black transition-all ${
              pin.length > i ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/40 scale-110' : 'bg-slate-100 text-slate-300'
            }`}>
              {pin.length > i ? '•' : ''}
            </div>
          ))}
        </div>

        {/* Error */}
        <div className="h-6 mb-4">
          {error && <p className="text-rose-500 text-sm font-bold animate-pulse">{error}</p>}
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {[1,2,3,4,5,6,7,8,9].map(num => (
            <button key={num} disabled={loading}
              onClick={() => pin.length < 4 && setPin(prev => prev + num)}
              className="h-16 bg-slate-50 hover:bg-slate-100 text-slate-800 text-2xl font-bold rounded-2xl transition-all active:scale-95 active:bg-slate-200">
              {num}
            </button>
          ))}
          <button disabled={loading} onClick={() => setPin(prev => prev.slice(0,-1))}
            className="h-16 bg-rose-50 hover:bg-rose-100 text-rose-500 flex items-center justify-center font-bold rounded-2xl transition-all active:scale-95">
            <Delete size={24}/>
          </button>
          <button disabled={loading} onClick={() => pin.length < 4 && setPin(prev => prev + '0')}
            className="h-16 bg-slate-50 hover:bg-slate-100 text-slate-800 text-2xl font-bold rounded-2xl transition-all active:scale-95 active:bg-slate-200">
            0
          </button>
          <button disabled={pin.length < 4 || loading} onClick={handleLogin}
            className="h-16 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xl font-bold rounded-2xl transition-all active:scale-95 shadow-lg shadow-orange-500/30 disabled:shadow-none">
            {loading ? '...' : 'OK'}
          </button>
        </div>

      </div>
    </div>
  );
}
