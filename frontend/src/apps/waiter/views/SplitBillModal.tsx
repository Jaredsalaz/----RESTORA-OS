import { useState } from 'react';
import { X, Scissors, Users, Check, DollarSign, ArrowRight } from 'lucide-react';
import { apiClient } from '../../../api/client';

interface SplitBillModalProps {
  orderId: string;
  items: { id: string; product_name: string; unit_price: number; quantity: number }[];
  total: number;
  onClose: () => void;
  onSplit: () => void;
}

export default function SplitBillModal({ orderId, items, total, onClose, onSplit }: SplitBillModalProps) {
  const [mode, setMode] = useState<'equal' | 'items'>('equal');
  const [numPeople, setNumPeople] = useState(2);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  // División equitativa
  const perPerson = total / numPeople;

  // División por items
  const selectedTotal = items
    .filter(i => selectedItems.includes(i.id))
    .reduce((sum, i) => sum + Number(i.unit_price) * i.quantity, 0);
  const remainingTotal = total - selectedTotal;

  const toggleItem = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSplitByItems = async () => {
    if (selectedItems.length === 0) {
      setError('Selecciona al menos un item para separar');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post(`/orders/${orderId}/split`, {
        item_ids: selectedItems,
      });
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al dividir la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center text-violet-600">
              <Scissors size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 dark:text-white">Dividir Cuenta</h2>
              <p className="text-xs text-slate-500">Total: ${Number(total).toFixed(2)}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-rose-100 hover:text-rose-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => { setMode('equal'); setResult(null); }}
            className={`flex-1 py-3 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
              mode === 'equal' ? 'text-violet-600 border-b-2 border-violet-600 bg-violet-50 dark:bg-violet-900/10' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Users size={16} /> Partes Iguales
          </button>
          <button
            onClick={() => { setMode('items'); setResult(null); }}
            className={`flex-1 py-3 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
              mode === 'items' ? 'text-violet-600 border-b-2 border-violet-600 bg-violet-50 dark:bg-violet-900/10' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Scissors size={16} /> Por Items
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[50vh] overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 text-rose-700 rounded-xl text-sm font-semibold">{error}</div>
          )}

          {result ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 mx-auto mb-4">
                <Check size={32} />
              </div>
              <h3 className="text-lg font-bold mb-2">¡Cuenta dividida!</h3>
              <p className="text-sm text-slate-500">{result.message}</p>
              <button
                onClick={() => { onSplit(); onClose(); }}
                className="mt-6 px-8 py-3 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 transition-colors"
              >
                Aceptar
              </button>
            </div>
          ) : mode === 'equal' ? (
            <div>
              <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-3">¿Entre cuántas personas?</label>
              <div className="flex items-center gap-4 mb-8">
                <button
                  onClick={() => setNumPeople(Math.max(2, numPeople - 1))}
                  className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl text-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  −
                </button>
                <div className="text-4xl font-black text-violet-600 w-16 text-center">{numPeople}</div>
                <button
                  onClick={() => setNumPeople(Math.min(20, numPeople + 1))}
                  className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl text-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  +
                </button>
              </div>

              <div className="bg-violet-50 dark:bg-violet-900/20 rounded-2xl p-6 text-center">
                <p className="text-sm font-semibold text-violet-600 dark:text-violet-400 mb-2">Cada persona paga</p>
                <p className="text-4xl font-black text-violet-700 dark:text-violet-300">${perPerson.toFixed(2)}</p>
                <p className="text-xs text-slate-500 mt-2">(Total ${Number(total).toFixed(2)} ÷ {numPeople} personas)</p>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-slate-500 mb-4">Selecciona los items para la <strong>segunda cuenta</strong>:</p>
              <div className="space-y-2 mb-6">
                {items.map(item => {
                  const isSelected = selectedItems.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all active:scale-[0.98] ${
                        isSelected
                          ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-violet-600 border-violet-600' : 'border-slate-300'
                        }`}>
                          {isSelected && <Check size={14} className="text-white" />}
                        </div>
                        <span className="font-semibold text-sm">{item.quantity}x {item.product_name}</span>
                      </div>
                      <span className="font-bold text-sm">${(Number(item.unit_price) * item.quantity).toFixed(2)}</span>
                    </button>
                  );
                })}
              </div>

              {selectedItems.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 flex items-center gap-1"><DollarSign size={14} /> Cuenta 1 (original)</span>
                    <span className="font-bold">${(remainingTotal * 1.16).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-center text-slate-400">
                    <ArrowRight size={16} />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-violet-600 flex items-center gap-1 font-semibold"><Scissors size={14} /> Cuenta 2 (nueva)</span>
                    <span className="font-bold text-violet-600">${(selectedTotal * 1.16).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!result && mode === 'items' && (
          <div className="p-6 border-t border-slate-200 dark:border-slate-800">
            <button
              disabled={selectedItems.length === 0 || loading}
              onClick={handleSplitByItems}
              className="w-full py-4 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-lg shadow-violet-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Scissors size={18} />
                  Dividir Cuenta
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
