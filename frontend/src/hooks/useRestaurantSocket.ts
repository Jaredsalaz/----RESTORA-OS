import { useEffect, useRef, useState, useCallback } from 'react';

export type WsStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

interface WsMessage {
  type: string;
  [key: string]: any;
}

interface UseRestaurantSocketOptions {
  restaurantId: string;
  channel: 'kitchen' | 'tables' | 'orders';
  onMessage?: (data: WsMessage) => void;
  enabled?: boolean;
}

const WS_BASE_URL = `ws://${window.location.hostname}:8081`;
const MAX_RECONNECT_ATTEMPTS = 20;
const BASE_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

export function useRestaurantSocket({
  restaurantId,
  channel,
  onMessage,
  enabled = true,
}: UseRestaurantSocketOptions) {
  const [status, setStatus] = useState<WsStatus>('disconnected');
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUnmountedRef = useRef(false);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (isUnmountedRef.current || !enabled || !restaurantId) return;

    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
    }

    setStatus('connecting');

    const url = `${WS_BASE_URL}/ws/${channel}/${restaurantId}`;
    console.log(`[WS-${channel.toUpperCase()}] Connecting to ${url}...`);

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (isUnmountedRef.current) return;
      console.log(`[WS-${channel.toUpperCase()}] ✅ Connected`);
      setStatus('connected');
      setReconnectAttempt(0);
    };

    ws.onmessage = (event) => {
      if (isUnmountedRef.current) return;
      try {
        const data: WsMessage = JSON.parse(event.data);
        onMessageRef.current?.(data);
      } catch (err) {
        console.warn(`[WS-${channel.toUpperCase()}] Failed to parse message:`, event.data);
      }
    };

    ws.onclose = (event) => {
      if (isUnmountedRef.current) return;
      console.log(`[WS-${channel.toUpperCase()}] ❌ Disconnected (code: ${event.code})`);
      setStatus('disconnected');
      wsRef.current = null;

      if (reconnectAttempt < MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(
          BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempt),
          MAX_RECONNECT_DELAY
        );
        setStatus('reconnecting');
        setReconnectAttempt(prev => prev + 1);

        clearReconnectTimeout();
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      }
    };

    ws.onerror = (error) => {
      console.error(`[WS-${channel.toUpperCase()}] Error:`, error);
    };
  }, [enabled, restaurantId, channel, reconnectAttempt, clearReconnectTimeout]);

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

  return {
    status,
    isConnected: status === 'connected',
    reconnect: () => {
      setReconnectAttempt(0);
      connect();
    }
  };
}
