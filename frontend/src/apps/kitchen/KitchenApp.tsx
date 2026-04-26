import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { useKitchenSocket } from './hooks/useKitchenSocket';
import type { WsStatus } from './hooks/useKitchenSocket';
import {
  ChefHat, Clock, Check, CheckCheck, Bell, Volume2, VolumeX,
  AlertTriangle, Flame, RefreshCw, Maximize2, History, Wifi, WifiOff, LogOut
} from 'lucide-react';

interface KitchenItem {
  id: string; product_name: string; quantity: number;
  modifiers: string[]; notes: string | null; status: string;
}
interface KitchenOrder {
  id: string; order_number: number | null; table_id: string;
  status: string; notes: string | null; guests: number;
  items: KitchenItem[]; created_at?: string;
}
interface TableInfo { id: string; name: string; }

const ALERT_SEC = 600;
const WARN_SEC = 420;

function fmtTimer(s: number) { return `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`; }
function elapsed(c?: string) { return c ? Math.floor((Date.now() - new Date(c).getTime())/1000) : 0; }

// ─── Item Card ──────────────────────────────────────
function ItemCard({ item, orderId, onReady }: { item: KitchenItem; orderId: string; onReady: (o:string,i:string)=>void }) {
  const done = item.status === 'ready';
  return (
    <div className={`flex items-center justify-between py-3 px-4 rounded-xl transition-all ${done ? 'bg-emerald-50 line-through opacity-50' : 'bg-slate-50 hover:bg-slate-100'}`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="text-2xl font-black text-blue-600 w-8 text-center">{item.quantity}×</span>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-slate-800 text-lg leading-tight">{item.product_name}</div>
          {item.modifiers?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {item.modifiers.map((m,i) => <span key={i} className="text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">{m}</span>)}
            </div>
          )}
          {item.notes && <p className="text-xs text-sky-600 mt-1 font-medium">📝 {item.notes}</p>}
        </div>
      </div>
      <button onClick={() => !done && onReady(orderId, item.id)} disabled={done}
        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all active:scale-90 shrink-0 ml-3 ${done ? 'bg-emerald-500 text-white cursor-default' : 'bg-slate-200 text-slate-400 hover:bg-emerald-500 hover:text-white'}`}>
        {done ? <CheckCheck size={24}/> : <Check size={24}/>}
      </button>
    </div>
  );
}

// ─── Order Card ─────────────────────────────────────
function OrderCard({ order, tableName, onItemReady, onAllReady, elapsedSec }: {
  order: KitchenOrder; tableName: string; elapsedSec: number;
  onItemReady: (o:string,i:string)=>void; onAllReady: (o:string)=>void;
}) {
  const allDone = order.items.every(i => i.status === 'ready');
  const over = elapsedSec >= ALERT_SEC;
  const warn = elapsedSec >= WARN_SEC && !over;
  const border = over ? 'border-rose-500 animate-pulse' : warn ? 'border-amber-500' : allDone ? 'border-emerald-500' : 'border-slate-200';
  const hdrBg = over ? 'bg-rose-50' : warn ? 'bg-amber-50' : allDone ? 'bg-emerald-50' : 'bg-slate-50';

  return (
    <div className={`bg-white rounded-2xl border-2 ${border} overflow-hidden shadow-xl transition-all`}>
      <div className={`${hdrBg} p-4 flex items-center justify-between`}>
        <div>
          <div className="text-2xl font-black text-slate-800">#{order.order_number || order.id?.substring(0,6)}</div>
          <div className="text-sm font-bold text-slate-500 mt-0.5">{tableName}</div>
        </div>
        <div className="flex items-center gap-2">
          {order.notes && <span className="text-[10px] bg-sky-100 text-sky-600 px-2 py-1 rounded-lg font-semibold max-w-[120px] truncate">📝 {order.notes}</span>}
          <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-mono font-bold text-sm ${over ? 'bg-rose-500 text-white' : warn ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
            {over && <Flame size={14} className="animate-bounce"/>}
            <Clock size={14}/> {fmtTimer(elapsedSec)}
          </div>
        </div>
      </div>
      <div className="p-4 space-y-2">
        {order.items.map(item => <ItemCard key={item.id} item={item} orderId={order.id} onReady={onItemReady}/>)}
      </div>
      {!allDone ? (
        <div className="p-4 border-t border-slate-200">
          <button onClick={() => onAllReady(order.id)}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg rounded-xl shadow-lg shadow-emerald-500/30 transition-all active:scale-95 flex items-center justify-center gap-2">
            <CheckCheck size={24}/> TODA LISTA
          </button>
        </div>
      ) : (
        <div className="p-4 border-t border-emerald-800 bg-emerald-900/30 text-center">
          <span className="text-emerald-400 font-bold flex items-center justify-center gap-2"><CheckCheck size={20}/> Lista para servir</span>
        </div>
      )}
    </div>
  );
}

// ─── History Card (read-only) ───────────────────────
function HistoryCard({ order, tableName }: { order: KitchenOrder; tableName: string }) {
  const totalSec = elapsed(order.created_at);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex justify-between items-center mb-3">
        <div>
          <span className="text-lg font-black text-slate-800">#{order.order_number || order.id?.substring(0,6)}</span>
          <span className="ml-2 text-sm text-slate-500">{tableName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${order.status === 'ready' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
            {order.status === 'ready' ? '✅ Lista' : order.status === 'delivered' ? '🍽️ Entregada' : order.status}
          </span>
          <span className="text-xs text-slate-500 font-mono">{fmtTimer(totalSec)}</span>
        </div>
      </div>
      <div className="space-y-1">
        {order.items.map(item => (
          <div key={item.id} className="flex items-center gap-2 text-sm text-slate-600">
            <span className="font-bold text-slate-800">{item.quantity}×</span>
            <span>{item.product_name}</span>
            {item.modifiers?.length > 0 && <span className="text-[10px] text-blue-600">({item.modifiers.join(', ')})</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── WS Status Badge ────────────────────────────────
function WsBadge({ status }: { status: WsStatus }) {
  const cfg: Record<WsStatus, { color: string; text: string }> = {
    connected: { color: 'bg-emerald-500', text: 'WebSocket activo' },
    connecting: { color: 'bg-amber-500 animate-pulse', text: 'Conectando...' },
    reconnecting: { color: 'bg-amber-500 animate-pulse', text: 'Reconectando...' },
    disconnected: { color: 'bg-rose-500', text: 'Desconectado — Polling 5s' },
  };
  const c = cfg[status];
  return (
    <span className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${c.color}`}/>
      {status === 'connected' ? <Wifi size={12}/> : <WifiOff size={12}/>}
      {c.text}
    </span>
  );
}

// ─── Main KDS Component ─────────────────────────────
export default function KitchenApp() {
  const qc = useQueryClient();
  const [soundOn, setSoundOn] = useState(true);
  const [area, setArea] = useState('all');
  const [tab, setTab] = useState<'active'|'history'>('active');
  const [timers, setTimers] = useState<Record<string, number>>({});
  const audioRef = useRef<HTMLAudioElement|null>(null);
  const prevCountRef = useRef(0);

  // Get restaurant ID from JWT or default
  const getRestaurantId = () => {
    try {
      const token = localStorage.getItem('access_token');
      if (token) { const p = JSON.parse(atob(token.split('.')[1])); return p.restaurant_id; }
    } catch {}
    return 'b2222222-2222-2222-2222-222222222222';
  };

  // WebSocket connection
  const { status: wsStatus } = useKitchenSocket({
    restaurantId: getRestaurantId(),
    onNewOrder: () => { qc.invalidateQueries({ queryKey: ['kds-orders'] }); playSound(); },
    onOrderUpdate: () => { qc.invalidateQueries({ queryKey: ['kds-orders'] }); },
  });

  // Fetch active orders
  const { data: activeOrders = [], isLoading } = useQuery({
    queryKey: ['kds-orders'],
    queryFn: async () => {
      const res = await apiClient.get('/orders', { params: { status: 'in_progress' } });
      return (res.data as KitchenOrder[]).sort((a, b) =>
        new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
      );
    },
    refetchInterval: wsStatus === 'connected' ? 15000 : 5000, // Slower polling when WS active
  });

  // Fetch completed orders for history
  const { data: historyOrders = [] } = useQuery({
    queryKey: ['kds-history'],
    queryFn: async () => {
      const resReady = await apiClient.get('/orders', { params: { status: 'ready' } });
      const resDone = await apiClient.get('/orders', { params: { status: 'delivered' } });
      return [...(resReady.data || []), ...(resDone.data || [])]
        .sort((a: KitchenOrder, b: KitchenOrder) =>
          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        ) as KitchenOrder[];
    },
    refetchInterval: 30000,
    enabled: tab === 'history',
  });

  // Fetch tables for name lookup
  const { data: tables = [] } = useQuery({
    queryKey: ['kds-tables'],
    queryFn: async () => { const r = await apiClient.get('/tables'); return r.data as TableInfo[]; },
    staleTime: 60000,
  });

  // Fetch categories for station mapping
  const { data: categories = [] } = useQuery({
    queryKey: ['kds-categories'],
    queryFn: async () => { const r = await apiClient.get('/menu/categories'); return r.data; },
    staleTime: 60000,
  });
  const { data: products = [] } = useQuery({
    queryKey: ['kds-products'],
    queryFn: async () => { const r = await apiClient.get('/menu/products'); return r.data; },
    staleTime: 60000,
  });

  const tableMap = Object.fromEntries(tables.map((t: TableInfo) => [t.id, t.name]));

  // Build product→station mapping from categories
  const productStationMap: Record<string, string> = {};
  const catStationMap: Record<string, string> = {};
  categories.forEach((c: any) => {
    const n = (c.name || '').toLowerCase();
    if (n.includes('bebida') || n.includes('drink') || n.includes('coctel') || n.includes('cerveza') || n.includes('vino'))
      catStationMap[c.id] = 'bar';
    else if (n.includes('ensalada') || n.includes('fría') || n.includes('cold') || n.includes('postre') || n.includes('dessert'))
      catStationMap[c.id] = 'cold';
    else catStationMap[c.id] = 'hot';
  });
  products.forEach((p: any) => { productStationMap[p.id] = catStationMap[p.category_id] || 'hot'; });

  // Filter orders by area
  const filteredOrders = activeOrders.filter((o: KitchenOrder) => {
    if (area === 'all') return o.items.some(i => i.status === 'preparing');
    // Check if any preparing item belongs to this station
    return o.items.some(i => i.status === 'preparing');
    // Note: proper station filtering requires product_id on items which we track
  });

  // Audio setup
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVggoSAd2Zzn7a0lGQ0JUpyd3l5bmZxi6msnWxJLj5ncXt5cmFmfpmqpodSNjdTaHN4d3FobIufo5dmQS07U2lxeH1zZ2qInZ6VaUIyOlFmdXh7dG1vh6CenWxMNzpTZnR3fHVtcYahm5JhRDU8VGpyd3t0bnOJoJySaUQ1PFRqcnd7dG5ziaGblmhFNjxTanJ3e3Ruc4igm5NnRTY8U2pyd3t0bnOHn5mRZkQ2O1Jpc3h8dW5zh5+ZkmZENTtSaXN3fHVtc4efmZFjRDY8U2pzd3p1bnOGoJqUaEU1PFNqc3d7dG5zh5+ak2dFNTxTanJ3e3Ruc4efmpNpRjY7U2pyeHt0bnSIoJuWaA==');
    audioRef.current.volume = 0.6;
  }, []);

  const playSound = useCallback(() => {
    if (soundOn && audioRef.current) audioRef.current.play().catch(() => {});
  }, [soundOn]);

  // Detect new orders via polling
  useEffect(() => {
    if (activeOrders.length > prevCountRef.current) playSound();
    prevCountRef.current = activeOrders.length;
  }, [activeOrders.length, playSound]);

  // Timers - use server created_at for accuracy
  useEffect(() => {
    const iv = setInterval(() => {
      setTimers(() => {
        const next: Record<string, number> = {};
        activeOrders.forEach((o: KitchenOrder) => { next[o.id] = elapsed(o.created_at); });
        return next;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [activeOrders]);

  const markItemReady = useCallback(async (oid: string, iid: string) => {
    try { await apiClient.patch(`/orders/${oid}/items/${iid}/ready`); qc.invalidateQueries({ queryKey: ['kds-orders'] }); } catch(e) { console.error(e); }
  }, [qc]);

  const markAllReady = useCallback(async (oid: string) => {
    try { await apiClient.patch(`/orders/${oid}/ready`); qc.invalidateQueries({ queryKey: ['kds-orders'] }); qc.invalidateQueries({ queryKey: ['kds-history'] }); } catch(e) { console.error(e); }
  }, [qc]);

  return (
    <div className="h-screen w-full bg-slate-50 text-slate-800 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <ChefHat size={28} className="text-white"/>
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">KDS — Cocina</h1>
            <p className="text-slate-500 text-sm font-medium">
              {filteredOrders.length} comanda{filteredOrders.length !== 1 ? 's' : ''} activa{filteredOrders.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Tab Toggle */}
          <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200">
            <button onClick={() => setTab('active')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${tab === 'active' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}>
              <ChefHat size={14} className="inline mr-1"/> Activas
            </button>
            <button onClick={() => setTab('history')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${tab === 'history' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}>
              <History size={14} className="inline mr-1"/> Historial
            </button>
          </div>
          {/* Area Filters */}
          {tab === 'active' && (
            <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200">
              {[{ k:'all', l:'Todo' }, { k:'hot', l:'🔥' }, { k:'cold', l:'❄️' }, { k:'bar', l:'🍺' }].map(f => (
                <button key={f.k} onClick={() => setArea(f.k)}
                  className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors ${area === f.k ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}>
                  {f.l}
                </button>
              ))}
            </div>
          )}
          <button onClick={() => setSoundOn(!soundOn)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors border border-slate-200 ${soundOn ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200'}`}>
            {soundOn ? <Volume2 size={20}/> : <VolumeX size={20}/>}
          </button>
          <button onClick={() => document.documentElement.requestFullscreen?.()}
            className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 border border-slate-200 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors">
            <Maximize2 size={20}/>
          </button>
          {/* Cerrar sesión */}
          <button onClick={() => { localStorage.removeItem('kitchen_token'); localStorage.removeItem('access_token'); window.location.reload(); }}
            className="px-4 py-2 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 hover:text-rose-600 flex items-center gap-2 transition-colors text-sm font-bold border border-rose-100">
            <LogOut size={16}/> Salir
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {tab === 'active' ? (
          isLoading ? (
            <div className="flex items-center justify-center h-full text-slate-500">
              <RefreshCw size={32} className="animate-spin mr-3"/>
              <span className="text-xl font-bold">Conectando con cocina...</span>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <ChefHat size={80} className="opacity-20 text-slate-300 mb-6"/>
              <h2 className="text-3xl font-black mb-2 text-slate-700">Sin comandas pendientes</h2>
              <p className="text-lg">Las nuevas comandas aparecerán aquí automáticamente</p>
              <div className="mt-6 flex items-center gap-2 text-sm">
                <Bell size={16}/> Sonido {soundOn ? 'activado' : 'desactivado'}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-max">
              {filteredOrders.map((order: KitchenOrder) => (
                <OrderCard key={order.id} order={order}
                  tableName={tableMap[order.table_id] || `Mesa ${order.table_id?.substring(0,4)}`}
                  onItemReady={markItemReady} onAllReady={markAllReady}
                  elapsedSec={timers[order.id] || elapsed(order.created_at)}/>
              ))}
            </div>
          )
        ) : (
          /* History Tab */
          historyOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <History size={64} className="opacity-20 text-slate-300 mb-4"/>
              <h2 className="text-2xl font-black text-slate-700">Sin historial aún</h2>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-max">
              {historyOrders.map((o: KitchenOrder) => (
                <HistoryCard key={o.id} order={o} tableName={tableMap[o.table_id] || `Mesa ${o.table_id?.substring(0,4)}`}/>
              ))}
            </div>
          )
        )}
      </main>

      {/* Footer Status */}
      <footer className="bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between text-sm text-slate-500 shrink-0">
        <WsBadge status={wsStatus}/>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><Clock size={12}/> &lt;7min</span>
          <span className="flex items-center gap-1 text-amber-500"><AlertTriangle size={12}/> 7-10min</span>
          <span className="flex items-center gap-1 text-rose-500"><Flame size={12}/> &gt;10min</span>
        </div>
      </footer>
    </div>
  );
}
