import { useState } from 'react';
import { X, Check, MessageSquare, Flame, Leaf, Wheat } from 'lucide-react';

interface ModifierModalProps {
  product: { id: string; name: string; price: number; modifiers?: string[] };
  onConfirm: (modifiers: string[], notes: string) => void;
  onClose: () => void;
}

// Modificadores globales disponibles para todos los productos
const GLOBAL_MODIFIERS = [
  { label: 'Sin cebolla', icon: '🧅' },
  { label: 'Sin picante', icon: '🌶️' },
  { label: 'Extra queso', icon: '🧀' },
  { label: 'Sin sal', icon: '🧂' },
  { label: 'Para llevar', icon: '📦' },
  { label: 'Urgente', icon: '⚡' },
];

// Modificadores específicos por tipo de producto
const SPECIAL_MODIFIERS: Record<string, { label: string; icon: string }[]> = {
  carne: [
    { label: 'Término: Blue', icon: '🔵' },
    { label: 'Término: Medio', icon: '🟡' },
    { label: 'Término: 3/4', icon: '🟠' },
    { label: 'Término: Bien cocido', icon: '🔴' },
  ],
  bebida: [
    { label: 'Sin hielo', icon: '🧊' },
    { label: 'Extra hielo', icon: '❄️' },
    { label: 'Sin azúcar', icon: '🚫' },
  ],
  ensalada: [
    { label: 'Sin gluten', icon: '🌾' },
    { label: 'Vegano', icon: '🌱' },
    { label: 'Aderezo aparte', icon: '🥗' },
  ],
};

export default function ModifierModal({ product, onConfirm, onClose }: ModifierModalProps) {
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // Detectar tipo de producto por nombre (heurística simple)
  const productNameLower = product.name.toLowerCase();
  let specialCategory = '';
  if (productNameLower.includes('filete') || productNameLower.includes('carne') || productNameLower.includes('arrachera') || productNameLower.includes('steak') || productNameLower.includes('ribeye')) {
    specialCategory = 'carne';
  } else if (productNameLower.includes('cerveza') || productNameLower.includes('limonada') || productNameLower.includes('refresco') || productNameLower.includes('agua') || productNameLower.includes('jugo') || productNameLower.includes('margarita')) {
    specialCategory = 'bebida';
  } else if (productNameLower.includes('ensalada') || productNameLower.includes('verde')) {
    specialCategory = 'ensalada';
  }

  // Combinar product-level modifiers (de la BD) con los globales
  const productModifiers = (product.modifiers || []).map(m => ({ label: String(m), icon: '⚙️' }));
  const specialMods = specialCategory ? (SPECIAL_MODIFIERS[specialCategory] || []) : [];
  const allModifiers = [...specialMods, ...productModifiers, ...GLOBAL_MODIFIERS];

  const toggleModifier = (mod: string) => {
    setSelectedModifiers(prev =>
      prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white">{product.name}</h2>
            <p className="text-blue-600 dark:text-blue-400 font-bold text-lg">${product.price.toFixed(2)}</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-rose-100 hover:text-rose-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modifiers */}
        <div className="p-6 max-h-[50vh] overflow-y-auto">
          {specialCategory && (
            <div className="mb-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                {specialCategory === 'carne' && <Flame size={14} className="text-orange-500" />}
                {specialCategory === 'bebida' && <span>🧊</span>}
                {specialCategory === 'ensalada' && <Leaf size={14} className="text-green-500" />}
                Opciones Especiales
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {specialMods.map(mod => {
                  const isSelected = selectedModifiers.includes(mod.label);
                  return (
                    <button
                      key={mod.label}
                      onClick={() => toggleModifier(mod.label)}
                      className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition-all active:scale-95
                        ${isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                    >
                      <span className="text-lg">{mod.icon}</span>
                      <span className="flex-1 text-left">{mod.label}</span>
                      {isSelected && <Check size={16} className="text-blue-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
            <Wheat size={14} />
            Modificadores Generales
          </h3>
          <div className="grid grid-cols-2 gap-2 mb-6">
            {GLOBAL_MODIFIERS.map(mod => {
              const isSelected = selectedModifiers.includes(mod.label);
              return (
                <button
                  key={mod.label}
                  onClick={() => toggleModifier(mod.label)}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition-all active:scale-95
                    ${isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                >
                  <span className="text-lg">{mod.icon}</span>
                  <span className="flex-1 text-left">{mod.label}</span>
                  {isSelected && <Check size={16} className="text-blue-600" />}
                </button>
              );
            })}
          </div>

          {/* Notes */}
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
            <MessageSquare size={14} />
            Nota Especial
          </h3>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Ej: Alérgico a mariscos, sin cilantro..."
            className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl resize-none h-20 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          />
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-4 rounded-xl font-bold text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 transition-colors active:scale-95"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(selectedModifiers, notes)}
            className="flex-[2] py-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Check size={20} />
            Agregar a Comanda
            {selectedModifiers.length > 0 && (
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{selectedModifiers.length} mod</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
