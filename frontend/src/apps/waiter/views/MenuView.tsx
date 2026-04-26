import { useState } from 'react';
import { Search, Plus, Settings2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useOrderStore } from '../store/useOrderStore';
import { apiClient } from '../../../api/client';
import ModifierModal from './ModifierModal';

export default function MenuView() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [modifierProduct, setModifierProduct] = useState<any>(null);
  const addItem = useOrderStore(state => state.addItem);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await apiClient.get('/menu/categories');
      return response.data;
    }
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await apiClient.get('/menu/products');
      return response.data;
    }
  });

  const filteredProducts = products.filter((p: any) => {
    const matchesCategory = activeCategory === 'all' || p.category_id === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleQuickAdd = (product: any) => {
    addItem({ id: String(product.id), name: product.name, price: product.price });
  };

  const handleAddWithModifiers = (product: any) => {
    setModifierProduct(product);
  };

  const handleModifierConfirm = (modifiers: string[], notes: string) => {
    if (modifierProduct) {
      addItem(
        { id: String(modifierProduct.id), name: modifierProduct.name, price: modifierProduct.price },
        modifiers,
        notes
      );
    }
    setModifierProduct(null);
  };

  return (
    <div className="p-8 h-full flex flex-col">
      {/* Header & Search */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Menú Digital</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Selecciona productos para la comanda</p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar producto..." 
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-4 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setActiveCategory('all')}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold transition-all whitespace-nowrap
            ${activeCategory === 'all' 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105' 
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
        >
          Todos
        </button>
        {categories.map((cat: any) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold transition-all whitespace-nowrap
                ${isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105' 
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
            >
              {cat.name}
            </button>
          )
        })}
      </div>

      {/* Products Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto pb-24">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-max">
        {isLoading && <div className="col-span-full p-8 text-center text-slate-500">Cargando menú...</div>}
        {filteredProducts.map((product: any) => (
          <div key={product.id} className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700 group cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="h-40 overflow-hidden relative">
              <img src={product.image_url || 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400&q=80'} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full">
                {product.prep_time_min} min
              </div>
              {!product.is_available && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white font-black text-lg bg-rose-600 px-4 py-2 rounded-xl">AGOTADO</span>
                </div>
              )}
            </div>
            <div className="p-5">
              <h3 className="font-bold text-lg leading-tight mb-1">{product.name}</h3>
              {product.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-2">{product.description}</p>
              )}
              <div className="flex justify-between items-end mt-4">
                <span className="text-xl font-extrabold text-blue-600 dark:text-blue-400">${Number(product.price).toFixed(2)}</span>
                <div className="flex gap-2">
                  {/* Botón para agregar con modificadores */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (product.is_available !== false) handleAddWithModifiers(product);
                    }}
                    disabled={product.is_available === false}
                    className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center hover:bg-amber-600 hover:text-white dark:hover:bg-amber-500 dark:hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Agregar con modificadores"
                  >
                    <Settings2 size={18} strokeWidth={2.5} />
                  </button>
                  {/* Botón de agregar rápido */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (product.is_available !== false) handleQuickAdd(product);
                    }}
                    disabled={product.is_available === false}
                    className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 dark:hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Agregar rápido"
                  >
                    <Plus size={20} strokeWidth={3} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        </div>
      </div>

      {/* Modifier Modal */}
      {modifierProduct && (
        <ModifierModal
          product={{
            id: String(modifierProduct.id),
            name: modifierProduct.name,
            price: modifierProduct.price,
            modifiers: modifierProduct.modifiers || [],
          }}
          onConfirm={handleModifierConfirm}
          onClose={() => setModifierProduct(null)}
        />
      )}
    </div>
  );
}
