import { 
  Building2, 
  MapPin, 
  Phone, 
  Globe, 
  Clock, 
  CreditCard, 
  Bell, 
  ShieldCheck,
  ChevronRight,
  Save
} from 'lucide-react';

export default function ConfigView() {
  const sections = [
    { id: 'general', label: 'General', icon: Building2 },
    { id: 'billing', label: 'Facturación', icon: CreditCard },
    { id: 'security', label: 'Seguridad', icon: ShieldCheck },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
  ];

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Menú Lateral de Configuración */}
        <aside className="space-y-2">
          {sections.map((section) => (
            <button 
              key={section.id}
              className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all font-bold text-sm ${
                section.id === 'general' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                : 'bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <section.icon size={20} />
                {section.label}
              </div>
              <ChevronRight size={16} />
            </button>
          ))}
        </aside>

        {/* Formulario de Configuración */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <h3 className="text-xl font-black text-slate-800 dark:text-white">Información del Restaurante</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Nombre Comercial</label>
                  <input 
                    type="text" 
                    defaultValue="La Paloma Restobar"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">RFC / Tax ID</label>
                  <input 
                    type="text" 
                    defaultValue="PAMO840512XYZ"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Dirección Física</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    defaultValue="Av. Principal #123, Col. Centro"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Teléfono</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      defaultValue="+52 961 123 4567"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Sitio Web</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      defaultValue="www.lapaloma.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95">
                <Save size={20} /> Guardar Cambios
              </button>
            </div>
          </div>

          {/* Sección de Preferencias rápidas */}
          <div className="bg-slate-900 p-8 rounded-3xl text-white space-y-6">
            <h4 className="font-bold flex items-center gap-2 text-blue-400">
              <Clock size={18} /> Operación del Sistema
            </h4>
            <div className="space-y-4">
              {[
                { label: 'Facturación Automática', desc: 'Generar factura al cerrar comanda' },
                { label: 'Modo Propina Sugerida', desc: 'Mostrar 10%, 15%, 20% en ticket' },
                { label: 'Control de Inventario Real', desc: 'Descontar ingredientes al vender' }
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div>
                    <p className="text-sm font-bold">{item.label}</p>
                    <p className="text-[10px] text-slate-400">{item.desc}</p>
                  </div>
                  <div className="w-12 h-6 rounded-full bg-blue-600 flex items-center px-1">
                    <div className="w-4 h-4 rounded-full bg-white ml-auto"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
