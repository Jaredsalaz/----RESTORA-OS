import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import { Clock, ChefHat, CheckCircle2, XCircle, DollarSign, AlertTriangle, RefreshCw, Eye, FileText } from 'lucide-react';
import { useState } from 'react';
import TicketModal from './TicketModal';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  open: { label: 'Abierta', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: Clock },
  in_progress: { label: 'En Cocina', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', icon: ChefHat },
  ready: { label: 'Lista', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', icon: CheckCircle2 },
  delivered: { label: 'Entregada', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', icon: CheckCircle2 },
  paid: { label: 'Pagada', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', icon: DollarSign },
  cancelled: { label: 'Cancelada', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300', icon: XCircle },
};

export default function HistoryView() {
  const [filter, setFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showTicket, setShowTicket] = useState(false);
  const [ticketOrderId, setTicketOrderId] = useState<string | null>(null);

  const { data: orders = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['order-history'],
    queryFn: async () => {
      // Pedir todas las órdenes (sin filtro de status para ver todo el historial)
      const response = await apiClient.get('/orders', { params: { status: '' } });
      return response.data;
    },
    refetchInterval: 15000, // Refrescar cada 15s
  });

  const filteredOrders = filter === 'all'
    ? orders
    : orders.filter((o: any) => o.status === filter);

  return (
    <div className="p-8 h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Historial del Turno</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {orders.length} comanda{orders.length !== 1 ? 's' : ''} en total
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
        {[
          { key: 'all', label: 'Todas' },
          { key: 'open', label: 'Abiertas' },
          { key: 'in_progress', label: 'En Cocina' },
          { key: 'ready', label: 'Listas' },
          { key: 'delivered', label: 'Entregadas' },
          { key: 'paid', label: 'Pagadas' },
          { key: 'cancelled', label: 'Canceladas' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
              filter === f.key
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-slate-500">
            <RefreshCw size={24} className="animate-spin mr-3" /> Cargando historial...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400">
            <AlertTriangle size={32} className="mb-2 opacity-30" />
            <p className="font-semibold">No hay comandas {filter !== 'all' ? 'con este estado' : ''}</p>
          </div>
        ) : (
          filteredOrders.map((order: any) => {
            const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.open;
            const StatusIcon = statusCfg.icon;
            return (
              <div
                key={order.id}
                className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${statusCfg.color}`}>
                      <StatusIcon size={20} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 dark:text-white">
                        Comanda #{order.order_number || order.id?.substring(0, 8)}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                        <span>{order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}</span>
                        {order.notes && <span className="text-amber-500 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded text-xs font-bold">📝 Notas</span>}
                        {order.status === 'in_progress' && order.items?.some((i: any) => i.status === 'ready') && (
                          <span className="text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full text-xs font-bold animate-pulse">
                            🔔 {order.items.filter((i: any) => i.status === 'ready').length} listo(s)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-lg text-slate-800 dark:text-white">
                      ${Number(order.total || 0).toFixed(2)}
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                  </div>
                </div>

                {/* Detalle expandido */}
                {selectedOrder?.id === order.id && order.items && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 space-y-2 animate-in slide-in-from-top duration-200">
                    {order.items.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-600 dark:text-slate-300">{item.quantity}x</span>
                          <span className="text-slate-700 dark:text-slate-200">{item.product_name}</span>
                          {item.modifiers?.length > 0 && (
                            <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 px-1.5 py-0.5 rounded-full">
                              +{item.modifiers.length} mod
                            </span>
                          )}
                          {item.notes && (
                            <span className="text-[10px] text-amber-500 italic">"{item.notes}"</span>
                          )}
                          {item.status === 'ready' && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-bold ml-1">
                              ✓ Listo
                            </span>
                          )}
                        </div>
                        <span className="font-semibold text-slate-600 dark:text-slate-300">
                          ${(Number(item.unit_price) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2 border-t border-dashed border-slate-200 dark:border-slate-600 font-bold">
                      <span>Total</span>
                      <span className="text-blue-600">${Number(order.total || 0).toFixed(2)}</span>
                    </div>

                    {order.status === 'paid' && (
                      <div className="pt-4 flex justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setTicketOrderId(order.id);
                            setShowTicket(true);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-md"
                        >
                          <FileText size={16} /> Ver Ticket / Reimprimir
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {showTicket && ticketOrderId && (
        <TicketModal
          orderId={ticketOrderId}
          onClose={() => {
            setShowTicket(false);
            setTicketOrderId(null);
          }}
        />
      )}
    </div>
  );
}
