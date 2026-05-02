import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  MoreVertical,
  Utensils,
  Clock,
  Zap,
  Layers,
  X,
  Save,
  CheckCircle2,
  AlertCircle,
  ImageIcon,
  Upload,
  Loader2,
  FolderPlus
} from 'lucide-react';
import { apiClient } from '../../../api/client';

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  category_id: string;
  price: number;
  is_available: boolean;
  prep_time_min: number;
  description?: string;
  image_url?: string;
  tags?: string[];
}

export default function MenuManagementView() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estados de UI
  const [activeCategoryId, setActiveCategoryId] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Formularios
  const [formData, setFormData] = useState({
    name: '', price: 0, category_id: '', description: '', prep_time_min: 15, image_url: '', tags: [] as string[]
  });
  const [catName, setCatName] = useState('');

  // 1. Obtener restaurantId
  const token = localStorage.getItem('access_token');
  let restaurantId = '';
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      restaurantId = payload.restaurant_id || localStorage.getItem('admin_selected_restaurant_id') || '';
    } catch (e) { console.error(e); }
  }

  // 2. Queries
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['admin-categories', restaurantId],
    queryFn: async () => {
      const res = await apiClient.get('/menu/categories', { params: { restaurant_id: restaurantId } });
      return res.data;
    },
    enabled: !!restaurantId
  });

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['admin-products', restaurantId],
    queryFn: async () => {
      const res = await apiClient.get('/menu/products', { params: { restaurant_id: restaurantId } });
      return res.data;
    },
    enabled: !!restaurantId
  });

  // 3. Mutations
  const createCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      return apiClient.post('/menu/categories', { name, sort_order: categories.length + 1 }, { params: { restaurant_id: restaurantId } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setIsCatModalOpen(false);
      setCatName('');
    }
  });

  const saveProductMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingProduct) return apiClient.put(`/menu/products/${editingProduct.id}`, data);
      return apiClient.post('/menu/products', data, { params: { restaurant_id: restaurantId } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      closeModal();
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post('/menu/upload-image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      return res.data.image_url;
    },
    onSuccess: (url) => setFormData(prev => ({ ...prev, image_url: url }))
  });

  // Controles
  const toggleTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag]
    }));
  };

  const predefinedTags = [
    { id: 'vegano', label: '🌿 Vegano', color: 'text-emerald-500 bg-emerald-50 border-emerald-200' },
    { id: 'vegetariano', label: '🧀 Vegetariano', color: 'text-amber-500 bg-amber-50 border-amber-200' },
    { id: 'sin_gluten', label: '🌾 Sin Gluten', color: 'text-blue-500 bg-blue-50 border-blue-200' },
    { id: 'picante', label: '🌶️ Picante', color: 'text-rose-500 bg-rose-50 border-rose-200' },
    { id: 'nueces', label: '🥜 Contiene Nueces', color: 'text-orange-500 bg-orange-50 border-orange-200' }
  ];
  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name, price: product.price, category_id: product.category_id,
      description: product.description || '', prep_time_min: product.prep_time_min, image_url: product.image_url || '',
      tags: product.tags || []
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormData({ name: '', price: 0, category_id: categories[0]?.id || '', description: '', prep_time_min: 15, image_url: '', tags: [] });
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = activeCategoryId === 'all' || p.category_id === activeCategoryId;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (isLoading) return <div className="p-20 text-center animate-pulse text-slate-400 font-bold italic">Sincronizando menú...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* BARRA SUPERIOR */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4 flex-1 w-full max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar platillo o ingrediente..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>

        <button 
          onClick={() => {
            setEditingProduct(null);
            setFormData({ name: '', price: 0, category_id: categories[0]?.id || '', description: '', prep_time_min: 15, image_url: '' });
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
          <Plus size={18} /> Nuevo Producto
        </button>
      </div>

      {/* GESTIÓN DE CATEGORÍAS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar">
        {/* Botón para añadir categoría */}
        <button 
          onClick={() => setIsCatModalOpen(true)}
          className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border-2 border-dashed border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-all shrink-0"
          title="Nueva Categoría"
        >
          <FolderPlus size={18} />
          <span className="text-[10px] font-black uppercase">Nueva</span>
        </button>

        <div className="w-[1px] h-8 bg-slate-200 dark:bg-slate-800 mx-2 shrink-0"></div>

        <button 
          onClick={() => setActiveCategoryId('all')}
          className={`flex items-center gap-3 px-6 py-3 rounded-2xl whitespace-nowrap transition-all border-2 ${
            activeCategoryId === 'all' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-100 dark:border-slate-800'
          }`}
        >
          <Layers size={18} />
          <span className="text-xs font-black uppercase">Todas</span>
        </button>
        {categories.map((cat) => (
          <button 
            key={cat.id}
            onClick={() => setActiveCategoryId(cat.id)}
            className={`flex items-center gap-3 px-6 py-3 rounded-2xl whitespace-nowrap transition-all border-2 ${
              activeCategoryId === cat.id ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-100 dark:border-slate-800'
            }`}
          >
            <Zap size={18} />
            <span className="text-xs font-black uppercase">{cat.name}</span>
          </button>
        ))}
      </div>

      {/* GRID DE PRODUCTOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <div key={product.id} className="group bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-2xl transition-all">
            <div className="relative h-44 bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
               {product.image_url ? (
                 <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
               ) : (
                 <Utensils size={40} className="text-slate-300" />
               )}
            </div>

            <div className="p-6 space-y-4">
               <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-bold text-blue-500 uppercase mb-1">{categories.find(c => c.id === product.category_id)?.name}</p>
                    <h4 className="text-lg font-black text-slate-800 dark:text-white leading-tight">{product.name}</h4>
                    {product.tags && product.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {product.tags.map(tag => (
                          <span key={tag} className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {tag.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-xl font-black text-slate-800 dark:text-white">${product.price}</span>
               </div>
               <div className="flex gap-2 pt-2">
                  <button onClick={() => openEditModal(product)} className="flex-1 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-600 rounded-xl text-xs font-bold hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2">
                     <Edit2 size={14} /> Editar
                  </button>
                  <button onClick={() => { if(confirm('¿Borrar?')) apiClient.delete(`/menu/products/${product.id}`).then(() => queryClient.invalidateQueries({queryKey: ['admin-products']})) }} className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-xl hover:text-rose-500 transition-colors">
                     <Trash2 size={16} />
                  </button>
               </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL NUEVA CATEGORÍA */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="font-black text-xl text-slate-800 dark:text-white">Nueva Categoría</h3>
              <button onClick={() => setIsCatModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
            </div>
            <div className="p-6">
                <label className="text-[10px] font-black uppercase text-slate-400">Nombre de la Categoría</label>
                <input 
                    type="text" 
                    value={catName} 
                    onChange={(e) => setCatName(e.target.value)} 
                    placeholder="Ej: Pizzas, Mariscos, Bebidas..."
                    className="w-full mt-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold text-lg" 
                />
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
              <button onClick={() => setIsCatModalOpen(false)} className="flex-1 py-3 font-bold text-slate-500">Cancelar</button>
              <button 
                onClick={() => createCategoryMutation.mutate(catName)}
                disabled={!catName || createCategoryMutation.isPending}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-black shadow-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {createCategoryMutation.isPending ? 'Guardando...' : 'Crear Sección'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PRODUCTO (reutilizado) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="font-black text-xl text-slate-800 dark:text-white">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h3>
              <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar">
                <div className="flex gap-2">
                    <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && uploadMutation.mutate(e.target.files[0])} accept="image/*" className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                        {uploadMutation.isPending ? <Loader2 className="animate-spin" /> : <ImageIcon size={16} />} Subir Foto
                    </button>
                    <input type="text" value={formData.image_url} onChange={(e) => setFormData({...formData, image_url: e.target.value})} placeholder="URL de imagen..." className="flex-[2] px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Nombre" className="col-span-2 md:col-span-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold" />
                    <input type="number" value={formData.price} onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})} placeholder="Precio" className="col-span-2 md:col-span-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold" />
                </div>
                <select value={formData.category_id} onChange={(e) => setFormData({...formData, category_id: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold">
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Descripción" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold resize-none"></textarea>
                
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Etiquetas / Alérgenos</label>
                  <div className="flex flex-wrap gap-2">
                    {predefinedTags.map(tag => {
                      const isActive = formData.tags.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          onClick={() => toggleTag(tag.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                            isActive ? tag.color : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {tag.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
              <button onClick={closeModal} className="flex-1 py-3 font-bold text-slate-500">Cancelar</button>
              <button onClick={() => saveProductMutation.mutate(formData)} disabled={!formData.name || saveProductMutation.isPending} className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-black shadow-lg">
                {saveProductMutation.isPending ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
