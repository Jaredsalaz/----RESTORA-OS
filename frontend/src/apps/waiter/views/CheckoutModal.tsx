import { useState } from 'react';
import { X, DollarSign, CreditCard, Receipt, Percent, ShieldCheck } from 'lucide-react';
import { useOrderStore } from '../store/useOrderStore';

interface CheckoutModalProps {
  onClose: () => void;
  onSuccess: (orderId: string) => void;
}

export default function CheckoutModal({ onClose, onSuccess }: CheckoutModalProps) {
  const { fullSubtotal, fullTax, fullTotal, processPayment, applyDiscount, activeOrderId } = useOrderStore();
  const [method, setMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [tipPercent, setTipPercent] = useState<number>(0);
  const [customTip, setCustomTip] = useState<string>('');
  
  // Efectivo
  const [cashReceived, setCashReceived] = useState<string>('');
  
  // Descuento
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountPin, setDiscountPin] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const calculatedTip = tipPercent === -1 ? Number(customTip) || 0 : fullTotal * (tipPercent / 100);
  const grandTotal = fullTotal + calculatedTip;
  const change = method === 'cash' ? Math.max(0, Number(cashReceived) - grandTotal) : 0;
  
  const canSubmit = method !== 'cash' || Number(cashReceived) >= grandTotal;

  const handleApplyDiscount = async () => {
    setIsProcessing(true);
    setError('');
    const res = await applyDiscount(discountPin, Number(discountAmount));
    setIsProcessing(false);
    if (res.success) {
      setShowDiscount(false);
      setDiscountPin('');
      setDiscountAmount('');
    } else {
      setError(res.error || 'Error al aplicar descuento');
    }
  };

  const handlePayment = async () => {
    setIsProcessing(true);
    setError('');
    const res = await processPayment({
      method,
      amount: method === 'cash' ? Number(cashReceived) : grandTotal,
      tip: calculatedTip,
    });
    
    setIsProcessing(false);
    if (res.success && activeOrderId) {
      onSuccess(activeOrderId);
    } else {
      setError(res.error || 'Error al procesar el pago');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Left Side: Resumen */}
        <div className="w-full md:w-5/12 bg-slate-50 dark:bg-slate-800/50 p-6 border-r border-slate-200 dark:border-slate-800 flex flex-col">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <Receipt className="text-blue-500" /> Resumen de Cuenta
          </h2>
          
          <div className="space-y-4 mb-6 flex-1">
            <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
              <span>Subtotal</span>
              <span>${fullSubtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
              <span>IVA (16%)</span>
              <span>${fullTax.toFixed(2)}</span>
            </div>
            
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex justify-between font-bold text-lg text-slate-800 dark:text-white">
                <span>Total Consumo</span>
                <span>${fullTotal.toFixed(2)}</span>
              </div>
            </div>
            
            {calculatedTip > 0 && (
              <div className="flex justify-between font-medium text-emerald-600 dark:text-emerald-400">
                <span>Propina</span>
                <span>+${calculatedTip.toFixed(2)}</span>
              </div>
            )}
            
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex justify-between font-black text-2xl text-blue-600 dark:text-blue-400">
                <span>TOTAL</span>
                <span>${grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          {!showDiscount && (
            <button 
              onClick={() => setShowDiscount(true)}
              className="text-xs font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1 justify-center py-2"
            >
              <Percent size={14} /> Aplicar Descuento
            </button>
          )}
          
          {showDiscount && (
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-blue-200 dark:border-blue-900 shadow-sm mt-auto">
              <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1">
                <ShieldCheck size={14} className="text-blue-500" /> Autorización de Gerente
              </h4>
              <input 
                type="password" 
                placeholder="PIN de Gerente" 
                value={discountPin}
                onChange={e => setDiscountPin(e.target.value)}
                className="w-full mb-2 p-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg dark:bg-slate-700"
              />
              <input 
                type="number" 
                placeholder="Monto a descontar $" 
                value={discountAmount}
                onChange={e => setDiscountAmount(e.target.value)}
                className="w-full mb-3 p-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg dark:bg-slate-700"
              />
              <div className="flex gap-2">
                <button onClick={() => setShowDiscount(false)} className="flex-1 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-lg">Cancelar</button>
                <button onClick={handleApplyDiscount} className="flex-1 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg">Aplicar</button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Cobro */}
        <div className="w-full md:w-7/12 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Procesar Pago</h2>
            <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Propina */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Propina Sugerida</label>
            <div className="grid grid-cols-4 gap-2">
              {[0, 10, 15, 20].map(p => (
                <button
                  key={p}
                  onClick={() => setTipPercent(p)}
                  className={`py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                    tipPercent === p 
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                      : 'border-transparent bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {p === 0 ? 'Nada' : `${p}%`}
                </button>
              ))}
            </div>
            {tipPercent === -1 && (
              <input
                type="number"
                placeholder="Monto personalizado"
                value={customTip}
                onChange={e => setCustomTip(e.target.value)}
                className="mt-2 w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            )}
            <button onClick={() => setTipPercent(tipPercent === -1 ? 0 : -1)} className="mt-2 text-xs font-bold text-blue-500">
              {tipPercent === -1 ? 'Usar porcentajes' : 'Monto personalizado'}
            </button>
          </div>

          {/* Método de pago */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Método de Pago</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setMethod('cash')}
                className={`py-3 flex flex-col items-center justify-center gap-1 rounded-xl border-2 transition-all ${
                  method === 'cash' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'border-transparent bg-slate-100 text-slate-500 dark:bg-slate-800 hover:bg-slate-200'
                }`}
              >
                <DollarSign size={24} /> <span className="text-xs font-bold">Efectivo</span>
              </button>
              <button
                onClick={() => setMethod('card')}
                className={`py-3 flex flex-col items-center justify-center gap-1 rounded-xl border-2 transition-all ${
                  method === 'card' ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'border-transparent bg-slate-100 text-slate-500 dark:bg-slate-800 hover:bg-slate-200'
                }`}
              >
                <CreditCard size={24} /> <span className="text-xs font-bold">Tarjeta</span>
              </button>
              <button
                onClick={() => setMethod('transfer')}
                className={`py-3 flex flex-col items-center justify-center gap-1 rounded-xl border-2 transition-all ${
                  method === 'transfer' ? 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'border-transparent bg-slate-100 text-slate-500 dark:bg-slate-800 hover:bg-slate-200'
                }`}
              >
                <Receipt size={24} /> <span className="text-xs font-bold">Transfer</span>
              </button>
            </div>
          </div>

          {/* Efectivo Calculadora */}
          {method === 'cash' && (
            <div className="mb-6 bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
              <label className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">Efectivo Recibido</label>
              <input
                type="number"
                value={cashReceived}
                onChange={e => setCashReceived(e.target.value)}
                placeholder="0.00"
                className="w-full p-3 text-xl font-bold bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div className="mt-3 flex justify-between items-center text-sm">
                <span className="font-bold text-slate-600 dark:text-slate-400">Su Cambio:</span>
                <span className={`font-black text-lg ${change > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                  ${change.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {error && <div className="mb-4 p-3 bg-rose-50 text-rose-600 text-sm font-bold rounded-xl">{error}</div>}

          <div className="mt-auto">
            <button
              disabled={!canSubmit || isProcessing}
              onClick={handlePayment}
              className="w-full py-4 bg-slate-800 hover:bg-slate-900 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-black text-lg rounded-2xl shadow-xl transition-all active:scale-95 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Procesando...
                </>
              ) : (
                <>Cobrar ${grandTotal.toFixed(2)}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
