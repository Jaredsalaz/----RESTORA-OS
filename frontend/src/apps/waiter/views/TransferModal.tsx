import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, ArrowRightLeft, User, MapPin } from 'lucide-react';
import { apiClient } from '../../../api/client';

interface TransferModalProps {
  orderId: string;
  currentTableName: string;
  onClose: () => void;
  onTransferred: () => void;
}

export default function TransferModal({ orderId, currentTableName, onClose, onTransferred }: TransferModalProps) {
  const [mode, setMode] = useState<'table' | 'waiter'>('table');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Obtener mesas disponibles
  const { data: tables = [] } = useQuery({
    queryKey: ['tables-transfer'],
    queryFn: async () => {
      const res = await apiClient.get('/tables');
      return res.data;
    },
  });

  // Obtener meseros del restaurante (simulado por ahora)
  const { data: waiters = [] } = useQuery({
    queryKey: ['waiters-transfer'],
    queryFn: async () => {
      // En producción sería un endpoint real
      try {
        const res = await apiClient.get('/admin/users?role=waiter');
        return res.data;
      } catch {
        // Fallback: meseros mock para MVP
        return [
          { id: 'waiter-1', full_name: 'Carlos R.' },
          { id: 'waiter-2', full_name: 'María L.' },
          { id: 'waiter-3', full_name: 'Pedro G.' },
        ];
      }
    },
  });

  const handleTransferTable = async (tableId: string) => {
    setLoading(true);
    setError('');
    try {
      await apiClient.patch(`/orders/${orderId}/transfer`, { 
        new_table_id: tableId 
      });
      onTransferred();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al transferir mesa');
    } finally {
      setLoading(false);
    }
  };

  const handleTransferWaiter = async (waiterId: string) => {
    setLoading(true);
    setError('');
    try {
      await apiClient.patch(`/orders/${orderId}/transfer`, { 
        new_waiter_id: waiterId 
      });
      onTransferred();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al transferir mesero');
    } finally {
      setLoading(false);
    }
  };

  const availableTables = tables.filter((t: any) => t.status === 'available');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600">
              <ArrowRightLeft size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 dark:text-white">Transferir Comanda</h2>
              <p className="text-xs text-slate-500">Desde {currentTableName}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-rose-100 hover:text-rose-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setMode('table')}
            className={`flex-1 py-3 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
              mode === 'table' 
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/10' 
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <MapPin size={16} /> Cambiar Mesa
          </button>
          <button
            onClick={() => setMode('waiter')}
            className={`flex-1 py-3 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
              mode === 'waiter' 
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/10' 
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <User size={16} /> Cambiar Mesero
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[50vh] overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 text-rose-700 rounded-xl text-sm font-semibold">{error}</div>
          )}

          {mode === 'table' ? (
            <div className="space-y-2">
              {availableTables.length === 0 ? (
                <p className="text-center text-slate-400 py-8">No hay mesas disponibles</p>
              ) : (
                availableTables.map((table: any) => (
                  <button
                    key={table.id}
                    disabled={loading}
                    onClick={() => handleTransferTable(table.id)}
                    className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-300 border-2 border-transparent transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center text-emerald-600 font-bold text-sm">
                        {table.name?.replace(/[^0-9]/g, '') || '?'}
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-slate-800 dark:text-white">{table.name}</div>
                        <div className="text-xs text-slate-500">{table.capacity} personas • {table.section || 'Salón'}</div>
                      </div>
                    </div>
                    <ArrowRightLeft size={16} className="text-slate-400" />
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {waiters.map((waiter: any) => (
                <button
                  key={waiter.id}
                  disabled={loading}
                  onClick={() => handleTransferWaiter(waiter.id)}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 border-2 border-transparent transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                      {waiter.full_name?.charAt(0) || '?'}
                    </div>
                    <span className="font-bold text-slate-800 dark:text-white">{waiter.full_name}</span>
                  </div>
                  <ArrowRightLeft size={16} className="text-slate-400" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
