import { useState } from 'react';
import { ShoppingBag, ChevronRight, User, Trash2, Plus, Minus, LayoutGrid, MessageSquare, Send, CheckCircle2, AlertTriangle, StickyNote, ChefHat, Clock, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOrderStore } from '../store/useOrderStore';
import CheckoutModal from './CheckoutModal';
import TicketModal from './TicketModal';

const ITEM_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-slate-200 text-slate-600' },
  preparing: { label: 'En cocina', color: 'bg-amber-100 text-amber-700' },
  ready: { label: 'Listo', color: 'bg-emerald-100 text-emerald-700' },
  delivered: { label: 'Entregado', color: 'bg-blue-100 text-blue-700' },
};

export default function OrderSidebar() {
  const navigate = useNavigate();
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [showOrderNotes, setShowOrderNotes] = useState(false);
  const [sendResult, setSendResult] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  
  // Checkout & Tickets
  const [showCheckout, setShowCheckout] = useState(false);
  const [showTicket, setShowTicket] = useState(false);
  const [paidOrderId, setPaidOrderId] = useState<string | null>(null);

  const {
    tableId,
    tableName,
    activeOrderId,
    existingItems,
    items,
    subtotal,
    tax,
    total,
    fullSubtotal,
    fullTax,
    fullTotal,
    orderNotes,
    isSending,
    isLoadingOrder,
    updateQuantity,
    removeItem,
    updateItemNotes,
    setOrderNotes,
    clearOrder,
    sendToKitchen,
  } = useOrderStore();

  const handleSendToKitchen = async () => {
    const result = await sendToKitchen();
    if (result.success) {
      const msg = activeOrderId
        ? `¡Ronda adicional enviada! ✨`
        : `¡Comanda enviada! #${result.orderId?.substring(0, 8)}`;
      setSendResult({ type: 'success', msg });
      setTimeout(() => {
        setSendResult(null);
        clearOrder();
        navigate('/waiter/tables');
      }, 2500);
    } else {
      setSendResult({ type: 'error', msg: result.error || 'Error desconocido' });
      setTimeout(() => setSendResult(null), 4000);
    }
  };

  // Estado vacío: no hay mesa seleccionada
  if (!tableId) {
    return (
      <aside className="w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center shadow-2xl z-10 text-slate-400">
        <LayoutGrid size={64} className="mb-4 opacity-20" />
        <h3 className="font-bold text-lg mb-2 text-slate-600 dark:text-slate-300">Ninguna mesa seleccionada</h3>
        <p className="text-sm">Selecciona una mesa en el mapa</p>
        <p className="text-sm">para abrir una comanda</p>
        <button 
          onClick={() => navigate('/waiter/tables')}
          className="mt-8 px-6 py-3 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 font-bold rounded-xl hover:bg-blue-100 transition-colors"
        >
          Ver Mapa de Mesas
        </button>
      </aside>
    );
  }

  if (isLoadingOrder) {
    return (
      <aside className="w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center shadow-2xl z-10">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-semibold text-slate-500">Cargando comanda activa...</p>
      </aside>
    );
  }

  const isExistingOrder = !!activeOrderId;

  return (
    <aside className="w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl z-10">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-bold flex items-center gap-2">
            {isExistingOrder ? (
              <>
                <ChefHat className="text-amber-600" size={22} />
                <span>Ronda Adicional</span>
              </>
            ) : (
              <>
                <ShoppingBag className="text-blue-600" />
                <span>Nueva Comanda</span>
              </>
            )}
          </h2>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            isExistingOrder
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
          }`}>
            {tableName || `Mesa ${tableId.substring(0, 4)}`}
          </span>
        </div>

        {isExistingOrder && (
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10 px-3 py-2 rounded-xl mb-3">
            <Clock size={14} />
            Comanda activa #{activeOrderId?.substring(0, 8)} — Agrega más items abajo
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
            <User size={16} /> <span>Mesero en turno</span>
          </div>
          {!isExistingOrder && (
            <button
              onClick={() => setShowOrderNotes(!showOrderNotes)}
              className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                orderNotes 
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' 
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              <StickyNote size={12} />
              {orderNotes ? 'Nota ✓' : 'Nota comanda'}
            </button>
          )}
        </div>

        {showOrderNotes && !isExistingOrder && (
          <div className="mt-4 animate-in slide-in-from-top duration-200">
            <textarea
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder="Nota general para toda la comanda..."
              className="w-full p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl resize-none h-16 text-sm focus:ring-2 focus:ring-amber-400 outline-none"
            />
          </div>
        )}
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">

        {/* ─── EXISTING ITEMS (ya enviados a cocina) ─── */}
        {existingItems.length > 0 && (
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1">
              <ChefHat size={12} /> Ya en cocina / servidos
            </h3>
            <div className="space-y-2">
              {existingItems.map(item => {
                const statusCfg = ITEM_STATUS_LABELS[item.status] || ITEM_STATUS_LABELS.pending;
                return (
                  <div key={item.id} className="flex items-center gap-3 py-2 px-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl opacity-70">
                    <span className="font-black text-sm w-6 text-center text-slate-500">{item.quantity}×</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 truncate pr-2">{item.product_name}</span>
                        <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                          ${(Number(item.unit_price) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.modifiers.map((mod: string, i: number) => (
                            <span key={i} className="text-[9px] font-bold bg-blue-100/50 text-blue-600/70 px-1.5 py-0.5 rounded-full">{mod}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${statusCfg.color}`}>{statusCfg.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500">Nuevos items ↓</span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
        )}

        {/* ─── NEW ITEMS (carrito actual, aún no enviados) ─── */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-slate-500">
            <Plus size={32} className="mb-3 opacity-20" />
            <p className="font-semibold text-sm">
              {isExistingOrder ? 'Agrega más items del menú' : 'La comanda está vacía'}
            </p>
            <p className="text-xs mt-1">Selecciona productos del menú</p>
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4 group">
              <div className="flex gap-3">
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-600 transition-colors shadow-sm"
                  >
                    <Plus size={14} />
                  </button>
                  <div className="font-black text-lg w-8 text-center">{item.quantity}</div>
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center hover:bg-amber-100 dark:hover:bg-amber-900/40 hover:text-amber-600 transition-colors shadow-sm"
                  >
                    <Minus size={14} />
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <span className="font-bold leading-tight pr-2 text-slate-800 dark:text-white">{item.name}</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>

                  {/* NEW badge */}
                  {isExistingOrder && (
                    <span className="inline-block mt-1 text-[9px] font-bold bg-blue-500 text-white px-2 py-0.5 rounded-full">NUEVO</span>
                  )}

                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.modifiers.map((mod, i) => (
                        <span key={i} className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">{mod}</span>
                      ))}
                    </div>
                  )}

                  {editingNoteId === item.id ? (
                    <div className="mt-2">
                      <input
                        type="text"
                        autoFocus
                        defaultValue={item.notes || ''}
                        placeholder="Escribe la nota..."
                        className="w-full p-2 text-xs bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        onBlur={(e) => { updateItemNotes(item.id, e.target.value); setEditingNoteId(null); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { updateItemNotes(item.id, (e.target as HTMLInputElement).value); setEditingNoteId(null); } }}
                      />
                    </div>
                  ) : item.notes ? (
                    <button
                      onClick={() => setEditingNoteId(item.id)}
                      className="mt-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10 px-2 py-1 rounded-lg inline-flex items-center gap-1 hover:bg-amber-100 transition-colors"
                    >
                      <MessageSquare size={10} /> {item.notes}
                    </button>
                  ) : null}

                  <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditingNoteId(item.id)} className="text-[10px] font-semibold text-slate-500 flex items-center gap-1 hover:text-blue-600 transition-colors">
                      <MessageSquare size={10} /> {item.notes ? 'Editar nota' : 'Agregar nota'}
                    </button>
                    <button onClick={() => removeItem(item.id)} className="text-[10px] font-semibold text-red-400 flex items-center gap-1 hover:text-red-600 transition-colors">
                      <Trash2 size={10} /> Eliminar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Send Result Toast */}
      {sendResult && (
        <div className={`mx-6 mb-2 p-3 rounded-xl flex items-center gap-2 text-sm font-bold animate-in slide-in-from-bottom duration-300 ${
          sendResult.type === 'success' 
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' 
            : 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
        }`}>
          {sendResult.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          {sendResult.msg}
        </div>
      )}

      {/* Totals & Actions */}
      <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800">
        {/* Si hay orden existente, mostrar totales completos */}
        {isExistingOrder && existingItems.length > 0 && (
          <div className="mb-4 pb-4 border-b border-dashed border-slate-200 dark:border-slate-700">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Items previos</span>
              <span>${(fullSubtotal - subtotal).toFixed(2)}</span>
            </div>
            {items.length > 0 && (
              <div className="flex justify-between text-xs text-blue-500 font-semibold">
                <span>+ Nuevos items</span>
                <span>+${subtotal.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>Subtotal {isExistingOrder ? '(total)' : ''}</span>
            <span>${(isExistingOrder ? fullSubtotal : subtotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>IVA (16%)</span>
            <span>${(isExistingOrder ? fullTax : tax).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-2xl font-black pt-4 border-t border-slate-200 dark:border-slate-700">
            <span>Total</span>
            <span className="text-blue-600 dark:text-blue-400">${(isExistingOrder ? fullTotal : total).toFixed(2)}</span>
          </div>
        </div>

        <button
          disabled={items.length === 0 || isSending}
          onClick={handleSendToKitchen}
          className={`w-full font-bold text-lg py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:bg-slate-300 disabled:cursor-not-allowed disabled:shadow-none text-white ${
            isExistingOrder 
              ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/30'
              : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30'
          }`}
        >
          {isSending ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send size={20} />
              {isExistingOrder ? 'Enviar Ronda Adicional' : 'Enviar a Cocina'}
              <ChevronRight size={20} />
            </>
          )}
        </button>

        {isExistingOrder && items.length === 0 && existingItems.length > 0 && existingItems.every(i => i.status === 'ready' || i.status === 'delivered') && (
          <button
            disabled={isSending}
            onClick={async () => {
              const res = await useOrderStore.getState().markAsDelivered();
              if (res.success) {
                setSendResult({ type: 'success', msg: 'Comanda entregada ✓' });
                setTimeout(() => {
                  setSendResult(null);
                  navigate('/waiter/tables');
                }, 2000);
              } else {
                setSendResult({ type: 'error', msg: res.error || 'Error' });
                setTimeout(() => setSendResult(null), 3000);
              }
            }}
            className="w-full mt-3 font-bold text-lg py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 text-white bg-blue-600 hover:bg-blue-700 shadow-blue-500/30 disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            <CheckCircle2 size={20} />
            Marcar como Entregada
          </button>
        )}

        {isExistingOrder && items.length === 0 && existingItems.length > 0 && (
          <button
            onClick={() => setShowCheckout(true)}
            className="w-full mt-3 font-bold text-lg py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 text-white bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30"
          >
            <DollarSign size={20} />
            Cobrar Cuenta
          </button>
        )}
      </div>

      {showCheckout && (
        <CheckoutModal 
          onClose={() => setShowCheckout(false)} 
          onSuccess={(orderId) => {
            setShowCheckout(false);
            setPaidOrderId(orderId);
            setShowTicket(true);
          }}
        />
      )}

      {showTicket && paidOrderId && (
        <TicketModal 
          orderId={paidOrderId} 
          onClose={() => {
            setShowTicket(false);
            setPaidOrderId(null);
            clearOrder();
            navigate('/waiter/tables');
          }}
        />
      )}
    </aside>
  );
}
