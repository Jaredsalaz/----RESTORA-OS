import { create } from 'zustand';
import { apiClient } from '../../../api/client';

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  modifiers?: string[];
}

// Items que ya fueron enviados a cocina (solo lectura, para mostrar en sidebar)
export interface ExistingItem {
  id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  notes?: string;
  modifiers?: string[];
  status: string; // preparing | ready | delivered
}

interface OrderState {
  tableId: string | null;
  tableName: string | null;
  activeOrderId: string | null;  // ID de orden existente (null = nueva comanda)
  existingItems: ExistingItem[]; // Items ya enviados a cocina
  items: OrderItem[];            // Items NUEVOS del carrito (aún no enviados)
  subtotal: number;
  tax: number;
  total: number;
  // Totales de la orden completa (existente + nuevos)
  fullSubtotal: number;
  fullTax: number;
  fullTotal: number;
  orderNotes: string;
  isSending: boolean;
  isLoadingOrder: boolean;
  lastOrderId: string | null;

  // Acciones
  setTable: (tableId: string, tableName: string) => void;
  loadExistingOrder: (tableId: string) => Promise<void>;
  addItem: (product: { id: string; name: string; price: number }, modifiers?: string[], notes?: string) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, delta: number) => void;
  updateItemNotes: (itemId: string, notes: string) => void;
  updateItemModifiers: (itemId: string, modifiers: string[]) => void;
  setOrderNotes: (notes: string) => void;
  clearOrder: () => void;
  sendToKitchen: () => Promise<{ success: boolean; orderId?: string; error?: string }>;
  markAsDelivered: () => Promise<{ success: boolean; error?: string }>;
  processPayment: (payload: { method: string; amount: number; tip: number }) => Promise<{ success: boolean; invoiceId?: string; error?: string }>;
  applyDiscount: (pin: string, discountAmount: number) => Promise<{ success: boolean; error?: string }>;
}

// Helper para decodificar JWT sin librerías
function decodeJWT(token: string): Record<string, any> | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

function recalcTotals(items: OrderItem[]) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.16;
  return { subtotal, tax, total: subtotal + tax };
}

function calcFullTotals(existingItems: ExistingItem[], newItems: OrderItem[]) {
  const existingSub = existingItems.reduce((sum, item) => sum + Number(item.unit_price) * item.quantity, 0);
  const newSub = newItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const fullSubtotal = existingSub + newSub;
  const fullTax = fullSubtotal * 0.16;
  return { fullSubtotal, fullTax, fullTotal: fullSubtotal + fullTax };
}

export const useOrderStore = create<OrderState>((set, get) => ({
  tableId: null,
  tableName: null,
  activeOrderId: null,
  existingItems: [],
  items: [],
  subtotal: 0,
  tax: 0,
  total: 0,
  fullSubtotal: 0,
  fullTax: 0,
  fullTotal: 0,
  orderNotes: '',
  isSending: false,
  isLoadingOrder: false,
  lastOrderId: null,

  setTable: (tableId, tableName) => set({ tableId, tableName }),

  // Cargar orden activa de una mesa ocupada
  loadExistingOrder: async (tableId: string) => {
    set({ isLoadingOrder: true });
    try {
      // Buscar órdenes para esta mesa sin filtro de status para evaluarlas todas
      const response = await apiClient.get('/orders', { params: { table_id: tableId, status: '' } });
      const orders = response.data || [];
      
      // Una mesa está en curso si tiene una orden que NO esté pagada ni cancelada
      // (open, in_progress, ready, delivered)
      const tableOrder = orders.find((o: any) => !['paid', 'cancelled'].includes(o.status));
      
      if (tableOrder) {
        const existingItems: ExistingItem[] = (tableOrder.items || []).map((item: any) => ({
          id: item.id,
          product_name: item.product_name,
          unit_price: Number(item.unit_price),
          quantity: item.quantity,
          notes: item.notes,
          modifiers: item.modifiers || [],
          status: item.status,
        }));

        const fullTotals = calcFullTotals(existingItems, []);

        set({
          activeOrderId: tableOrder.id,
          existingItems,
          orderNotes: tableOrder.notes || '',
          ...fullTotals,
          isLoadingOrder: false,
        });
      } else {
        set({ activeOrderId: null, existingItems: [], isLoadingOrder: false });
      }
    } catch (err) {
      console.error('Error loading existing order:', err);
      set({ activeOrderId: null, existingItems: [], isLoadingOrder: false });
    }
  },

  addItem: (product, modifiers = [], notes = '') => {
    set((state) => {
      const existingItem = !modifiers.length && !notes
        ? state.items.find(item => item.productId === product.id && !item.modifiers?.length && !item.notes)
        : null;

      let newItems;
      if (existingItem) {
        newItems = state.items.map(item =>
          item.id === existingItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        newItems = [
          ...state.items,
          {
            id: crypto.randomUUID(),
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            modifiers,
            notes,
          },
        ];
      }

      const newTotals = recalcTotals(newItems);
      const fullTotals = calcFullTotals(state.existingItems, newItems);

      return { items: newItems, ...newTotals, ...fullTotals };
    });
  },

  removeItem: (itemId) => {
    set((state) => {
      const newItems = state.items.filter(item => item.id !== itemId);
      const newTotals = recalcTotals(newItems);
      const fullTotals = calcFullTotals(state.existingItems, newItems);
      return { items: newItems, ...newTotals, ...fullTotals };
    });
  },

  updateQuantity: (itemId, delta) => {
    set((state) => {
      const newItems = state.items.map(item => {
        if (item.id === itemId) {
          const newQuantity = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQuantity };
        }
        return item;
      });
      const newTotals = recalcTotals(newItems);
      const fullTotals = calcFullTotals(state.existingItems, newItems);
      return { items: newItems, ...newTotals, ...fullTotals };
    });
  },

  updateItemNotes: (itemId, notes) => {
    set((state) => ({
      items: state.items.map(item =>
        item.id === itemId ? { ...item, notes } : item
      ),
    }));
  },

  updateItemModifiers: (itemId, modifiers) => {
    set((state) => ({
      items: state.items.map(item =>
        item.id === itemId ? { ...item, modifiers } : item
      ),
    }));
  },

  setOrderNotes: (orderNotes) => set({ orderNotes }),

  clearOrder: () =>
    set({
      items: [],
      existingItems: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      fullSubtotal: 0,
      fullTax: 0,
      fullTotal: 0,
      orderNotes: '',
      tableId: null,
      tableName: null,
      activeOrderId: null,
      lastOrderId: null,
    }),

  sendToKitchen: async () => {
    const state = get();
    if (!state.tableId || state.items.length === 0) {
      return { success: false, error: 'No hay mesa o items nuevos para enviar' };
    }

    set({ isSending: true });

    try {
      const token = localStorage.getItem('access_token');
      const decoded = token ? decodeJWT(token) : null;
      const waiterId = decoded?.sub || '00000000-0000-0000-0000-000000000000';
      const restaurantId = decoded?.restaurant_id || '00000000-0000-0000-0000-000000000000';

      let orderId: string;

      if (state.activeOrderId) {
        // ─── RONDA ADICIONAL: Agregar items a orden existente ───
        orderId = state.activeOrderId;

        const newItemsPayload = state.items.map(item => ({
          product_id: item.productId,
          product_name: item.name,
          unit_price: item.price,
          quantity: item.quantity,
          modifiers: item.modifiers || [],
          notes: item.notes || null,
        }));

        await apiClient.patch(`/orders/${orderId}/items`, newItemsPayload);

      } else {
        // ─── NUEVA COMANDA: Crear orden desde cero ───
        const orderPayload = {
          restaurant_id: restaurantId,
          table_id: state.tableId,
          waiter_id: waiterId,
          guests: 1,
          notes: state.orderNotes || null,
          items: state.items.map(item => ({
            product_id: item.productId,
            product_name: item.name,
            unit_price: item.price,
            quantity: item.quantity,
            modifiers: item.modifiers || [],
            notes: item.notes || null,
          })),
        };

        const createRes = await apiClient.post('/orders', orderPayload);
        orderId = createRes.data.id;
      }

      // Enviar SOLO items pendientes a cocina
      await apiClient.post(`/orders/${orderId}/send-to-kitchen`);

      set({ isSending: false, lastOrderId: orderId });
      return { success: true, orderId };
    } catch (err: any) {
      set({ isSending: false });
      const errorMsg = err.response?.data?.detail || err.message || 'Error al enviar a cocina';
      return { success: false, error: errorMsg };
    }
  },

  markAsDelivered: async () => {
    const { activeOrderId } = get();
    if (!activeOrderId) return { success: false, error: 'No hay comanda activa' };

    set({ isSending: true });
    try {
      await apiClient.post(`/orders/${activeOrderId}/close`);
      set({ isSending: false });
      get().clearOrder();
      return { success: true };
    } catch (err: any) {
      console.error('Error marking as delivered:', err);
      set({ isSending: false });
      return { success: false, error: err.response?.data?.detail || 'Error al marcar entregada' };
    }
  },

  processPayment: async (payload) => {
    const { activeOrderId } = get();
    if (!activeOrderId) return { success: false, error: 'No hay comanda activa' };

    set({ isSending: true });
    try {
      const res = await apiClient.post(`/payments/orders/${activeOrderId}/pay`, payload);
      set({ isSending: false });
      // El clearOrder se hará en el onSuccess del modal para permitir ver el ticket
      return { success: true, invoiceId: res.data.id };
    } catch (err: any) {
      console.error('Error al procesar pago:', err);
      set({ isSending: false });
      return { success: false, error: err.response?.data?.detail || 'Error al cobrar' };
    }
  },

  applyDiscount: async (pin, discountAmount) => {
    const { activeOrderId } = get();
    if (!activeOrderId) return { success: false, error: 'No hay comanda activa' };

    set({ isSending: true });
    try {
      await apiClient.post(`/payments/orders/${activeOrderId}/discount`, { pin, discount_amount: discountAmount });
      set({ isSending: false });
      // Recargar la orden para actualizar totales
      await get().loadExistingOrder(get().tableId!);
      return { success: true };
    } catch (err: any) {
      console.error('Error al aplicar descuento:', err);
      set({ isSending: false });
      return { success: false, error: err.response?.data?.detail || 'Error al aplicar descuento' };
    }
  },
}));
