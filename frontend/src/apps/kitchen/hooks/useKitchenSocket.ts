import { useEffect, useRef, useState, useCallback } from 'react';

export type WsStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

interface WsMessage {
  type: string;
  [key: string]: any;
}

interface UseKitchenSocketOptions {
  restaurantId: string;
  onNewOrder?: (data: WsMessage) => void;
  onOrderUpdate?: (data: WsMessage) => void;
  onMessage?: (data: WsMessage) => void;
  enabled?: boolean;
}

const WS_BASE_URL = `ws://${window.location.hostname}:8081`;
const MAX_RECONNECT_ATTEMPTS = 20;
const BASE_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

export function useKitchenSocket({
  restaurantId,
  onNewOrder,
  onOrderUpdate,
  onMessage,
  enabled = true,
}: UseKitchenSocketOptions) {
  const [status, setStatus] = useState<WsStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<WsMessage | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUnmountedRef = useRef(false);
  const callbacksRef = useRef({ onNewOrder, onOrderUpdate, onMessage });

  // Keep callbacks ref up to date
  useEffect(() => {
    callbacksRef.current = { onNewOrder, onOrderUpdate, onMessage };
  }, [onNewOrder, onOrderUpdate, onMessage]);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (isUnmountedRef.current || !enabled || !restaurantId) return;

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
    }

    setStatus('connecting');

    const url = `${WS_BASE_URL}/ws/kitchen/${restaurantId}`;
    console.log(`[KDS-WS] Connecting to ${url}...`);

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (isUnmountedRef.current) return;
      console.log('[KDS-WS] ✅ Connected');
      setStatus('connected');
      setReconnectAttempt(0);
    };

    ws.onmessage = (event) => {
      if (isUnmountedRef.current) return;
      try {
        const data: WsMessage = JSON.parse(event.data);
        setLastMessage(data);

        // Route by message type
        switch (data.type) {
          case 'new_order':
          case 'additional_round':
            callbacksRef.current.onNewOrder?.(data);
            break;
          case 'order_update':
          case 'item_ready':
          case 'order_ready':
            callbacksRef.current.onOrderUpdate?.(data);
            break;
        }

        callbacksRef.current.onMessage?.(data);
      } catch (err) {
        console.warn('[KDS-WS] Failed to parse message:', event.data);
      }
    };

    ws.onclose = (event) => {
      if (isUnmountedRef.current) return;
      console.log(`[KDS-WS] ❌ Disconnected (code: ${event.code})`);
      setStatus('disconnected');
      wsRef.current = null;

      // Auto-reconnect with exponential backoff
      if (reconnectAttempt < MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(
          BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempt),
          MAX_RECONNECT_DELAY
        );
        console.log(`[KDS-WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempt + 1}/${MAX_RECONNECT_ATTEMPTS})`);
        setStatus('reconnecting');
        setReconnectAttempt(prev => prev + 1);

        clearReconnectTimeout();
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      }
    };

    ws.onerror = (error) => {
      console.error('[KDS-WS] Error:', error);
    };
  }, [enabled, restaurantId, reconnectAttempt, clearReconnectTimeout]);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    isUnmountedRef.current = false;
    connect();

    return () => {
      isUnmountedRef.current = true;
      clearReconnectTimeout();
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    setReconnectAttempt(0);
    clearReconnectTimeout();
    connect();
  }, [connect, clearReconnectTimeout]);

  return {
    status,
    lastMessage,
    reconnectAttempt,
    reconnect,
    isConnected: status === 'connected',
  };
}
