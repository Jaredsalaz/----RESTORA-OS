import { useEffect, useState } from 'react';
import KitchenApp from './KitchenApp';

export default function KitchenWrapper() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('kitchen_token') || localStorage.getItem('access_token');
    if (!token) {
      // No hay token → mandar al login principal
      window.location.href = '/waiter';
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp && Date.now() / 1000 > payload.exp) {
        localStorage.removeItem('kitchen_token');
        window.location.href = '/waiter';
        return;
      }
      if (payload.role === 'kitchen') {
        setAuthorized(true);
      } else {
        // Token no es de cocina → mandar al login
        window.location.href = '/waiter';
      }
    } catch {
      window.location.href = '/waiter';
    }
  }, []);

  if (authorized === null) {
    return (
      <div className="h-screen w-full bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <KitchenApp />;
}
