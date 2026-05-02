import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign, CreditCard, Banknote, Receipt, Clock, TrendingUp,
  CheckCircle2, XCircle, FileText, Download, Wallet, ArrowRight
} from 'lucide-react';
import { apiClient } from '../../api/client';

interface Payment {
  id: string;
  amount: number;
  method: string;
  status: string;
  processed_at: string;
}

interface Order {
  id: string;
  order_number: number;
  table_id: string;
  status: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  items: any[];
}

export default function CashierApp() {
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [tip, setTip] = useState('');

  const token = localStorage.getItem('access_token');
  let restaurantId = '';
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      restaurantId = payload.restaurant_id;
    } catch (e) { console.error(e); }
  }

  // Ordenes listas para cobrar
  const { data: readyOrders = [] } = useQuery<Order[]>({
    queryKey: ['cashier-ready-orders'],
    queryFn: async () => {
      const res = await apiClient.get('/orders', { params: { status: 'ready' } });
      return res.data;
    },
    refetchInterval: 5000
  });

  // Ordenes cobradas hoy
  const { data: paidOrders = [] } = useQuery<Order[]>({
    queryKey: ['cashier-paid-orders'],
    queryFn: async () => {
      const res = await apiClient.get('/orders', { params: { status: 'paid' } });
      return res.data;
    },
    refetchInterval: 15000
  });

  const payMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrder) return;
      const amount = paymentMethod === 'cash' ? parseFloat(amountReceived) : selectedOrder.total;
      return apiClient.post(`/payments/orders/${selectedOrder.id}/pay`, {
        method: paymentMethod,
        amount: amount,
        tip: parseFloat(tip) || 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashier-ready-orders'] });
      queryClient.invalidateQueries({ queryKey: ['cashier-paid-orders'] });
      setSelectedOrder(null);
      setAmountReceived('');
      setTip('');
    }
  });

  const totalRevenue = paidOrders.reduce((acc, o) => acc + (o.total || 0), 0);
  const change = paymentMethod === 'cash' && selectedOrder 
    ? Math.max(0, parseFloat(amountReceived || '0') - selectedOrder.total)
    : 0;

  const methods = [
    { value: 'cash', label: 'Efectivo', icon: Banknote, color: 'emerald' },
    { value: 'card', label: 'Tarjeta', icon: CreditCard, color: 'blue' },
    { value: 'transfer', label: 'Transferencia', icon: Wallet, color: 'violet' },
  ];

  return (
    <div className="h-screen w-full bg-slate-50 flex overflow-hidden">
      
      {/* Panel Izquierdo: Cola de Cobro */}
      <div className="w-96 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-200">
          <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <DollarSign className="text-emerald-500" size={24} /> Caja
          </h1>
          <p className="text-sm text-slate-400 font-medium mt-1">{readyOrders.length} ordenes listas para cobrar</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {readyOrders.length === 0 ? (
            <div className="text-center py-20 text-slate-400 italic">
              <Receipt size={48} className="mx-auto opacity-20 mb-4" />
              <p className="font-bold">Sin ordenes pendientes de cobro</p>
            </div>
          ) : readyOrders.map((order) => (
            <button
              key={order.id}
              onClick={() => { setSelectedOrder(order); setAmountReceived(''); setTip(''); }}
              className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                selectedOrder?.id === order.id 
                  ? 'border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-500/10' 
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-lg font-black text-slate-800">#{order.order_number || order.id.substring(0,6)}</span>
                <span className="text-lg font-black text-emerald-600">${order.total?.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-bold">
                <span>{order.items?.length || 0} productos</span>
                <span>|</span>
                <span>{order.items?.reduce((a: number, i: any) => a + i.quantity, 0)} items</span>
              </div>
            </button>
          ))}
        </div>

        {/* KPIs del turno */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <p className="text-[9px] font-black text-slate-400 uppercase">Cobrados Hoy</p>
              <p className="text-lg font-black text-slate-800">{paidOrders.length}</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <p className="text-[9px] font-black text-slate-400 uppercase">Revenue</p>
              <p className="text-lg font-black text-emerald-600">${totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Panel Derecho: Detalle de Cobro */}
      <div className="flex-1 flex items-center justify-center p-10">
        {!selectedOrder ? (
          <div className="text-center text-slate-400">
            <CreditCard size={80} className="mx-auto opacity-10 mb-6" />
            <h2 className="text-2xl font-black text-slate-300">Selecciona una orden para cobrar</h2>
            <p className="text-sm mt-2">Las ordenes listas aparecen en el panel izquierdo</p>
          </div>
        ) : (
          <div className="w-full max-w-lg space-y-6">
            {/* Resumen */}
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-slate-800">Comanda #{selectedOrder.order_number || selectedOrder.id.substring(0,6)}</h2>
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-slate-100 rounded-xl">
                  <XCircle size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="space-y-2 mb-6">
                {selectedOrder.items?.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-slate-600">{item.quantity}x {item.product_name}</span>
                    <span className="font-bold text-slate-800">${(item.unit_price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-2">
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Subtotal</span><span>${selectedOrder.subtotal?.toFixed(2)}</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-sm text-rose-500">
                    <span>Descuento</span><span>-${selectedOrder.discount?.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-slate-500">
                  <span>IVA (16%)</span><span>${selectedOrder.tax?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xl font-black text-slate-800 pt-2 border-t border-slate-200">
                  <span>TOTAL</span><span className="text-emerald-600">${selectedOrder.total?.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Metodo de Pago */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4">Metodo de Pago</h3>
              <div className="grid grid-cols-3 gap-3">
                {methods.map(m => (
                  <button
                    key={m.value}
                    onClick={() => setPaymentMethod(m.value)}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                      paymentMethod === m.value 
                        ? `border-${m.color}-500 bg-${m.color}-50 text-${m.color}-600` 
                        : 'border-slate-200 text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <m.icon size={24} />
                    <span className="text-xs font-black uppercase">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Monto y Propina */}
            {paymentMethod === 'cash' && (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400">Monto Recibido</label>
                    <input type="number" value={amountReceived} onChange={e => setAmountReceived(e.target.value)}
                      placeholder="$0.00" className="w-full mt-1 px-4 py-3 bg-slate-50 rounded-xl font-black text-2xl text-emerald-600 outline-none border-2 border-transparent focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400">Cambio</label>
                    <div className="mt-1 px-4 py-3 bg-amber-50 rounded-xl font-black text-2xl text-amber-600 border-2 border-amber-200">
                      ${change.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Propina */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <label className="text-[9px] font-black uppercase text-slate-400">Propina (opcional)</label>
              <div className="flex gap-3 mt-2">
                {[0, 10, 15, 20].map(pct => {
                  const tipAmount = pct === 0 ? 0 : (selectedOrder.total * pct / 100);
                  return (
                    <button key={pct} onClick={() => setTip(tipAmount.toFixed(2))}
                      className={`flex-1 py-2 rounded-xl text-sm font-black border-2 transition-all ${
                        tip === tipAmount.toFixed(2) ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200 text-slate-500'
                      }`}>
                      {pct === 0 ? 'Sin' : `${pct}%`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Boton Cobrar */}
            <button
              onClick={() => payMutation.mutate()}
              disabled={payMutation.isPending || (paymentMethod === 'cash' && parseFloat(amountReceived || '0') < selectedOrder.total)}
              className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-xl shadow-2xl shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-3 active:scale-95"
            >
              {payMutation.isPending ? (
                <span className="animate-pulse">Procesando...</span>
              ) : (
                <><CheckCircle2 size={28} /> Cobrar ${selectedOrder.total?.toFixed(2)}</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
