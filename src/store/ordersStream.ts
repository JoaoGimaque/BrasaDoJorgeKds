import {
  connectOrdersEventStream,
  type OrdersEventStream,
  type OrdersEventStreamHandlers,
} from '../services/ordersEventStream';
import {
  applyOrdersEvent,
  type OrdersEventName,
} from './ordersEventHandler';
import type { OrdersAction } from './ordersReducer';

type Dispatch = (action: OrdersAction) => void;

export interface OrdersStreamStatusHandlers {
  onOpen?(): void;
  onError?(error: Error): void;
  onProtocolError?(error: Error): void;
  onClose?(): void;
}

export interface OrdersStreamOptions {
  retryDelayMs?: number;
  maxRetryDelayMs?: number;
  createStream?: (
    baseUrl: string,
    handlers: OrdersEventStreamHandlers,
  ) => OrdersEventStream;
}

export function connectOrdersToStore(
  baseUrl: string,
  dispatch: Dispatch,
  statusHandlers: OrdersStreamStatusHandlers = {},
  options: OrdersStreamOptions = {},
): OrdersEventStream {
  const retryDelayMs = options.retryDelayMs ?? 1000;
  const maxRetryDelayMs = options.maxRetryDelayMs ?? 30000;
  const createStream = options.createStream ?? connectOrdersEventStream;
  let stream: OrdersEventStream | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let retryAttempt = 0;
  let closed = false;

  const setConnectionStatus = (
    status: 'connecting' | 'connected' | 'reconnecting' | 'disconnected',
    message: string | null,
  ) => {
    dispatch({
      type: 'connectionStatusChanged',
      status,
      retryAttempt,
      message,
    });
  };

  const handleEvent = (eventName: OrdersEventName, data: string | null) => {
    try {
      applyOrdersEvent(dispatch, eventName, data);
    } catch (error) {
      statusHandlers.onProtocolError?.(
        error instanceof Error
          ? error
          : new Error('Não foi possível processar um evento de pedido.'),
      );
    }
  };

  const scheduleReconnect = (error: Error) => {
    if (closed || retryTimer) {
      return;
    }

    retryAttempt += 1;
    setConnectionStatus('reconnecting', error.message);
    stream?.close();
    stream = undefined;

    const delay = Math.min(
      retryDelayMs * 2 ** (retryAttempt - 1),
      maxRetryDelayMs,
    );
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      openStream();
    }, delay);
  };

  const handlers: OrdersEventStreamHandlers = {
    onSnapshot: data => handleEvent('snapshot', data),
    onOrderCreated: data => handleEvent('order.created', data),
    onOrderUpdated: data => handleEvent('order.updated', data),
    onOpen: () => {
      if (closed) {
        return;
      }
      retryAttempt = 0;
      setConnectionStatus('connected', null);
      statusHandlers.onOpen?.();
    },
    onError: error => {
      statusHandlers.onError?.(error);
      scheduleReconnect(error);
    },
    onClose: () => {
      statusHandlers.onClose?.();
      scheduleReconnect(new Error('A conexão de eventos foi encerrada.'));
    },
  };

  function openStream() {
    if (closed) {
      return;
    }

    setConnectionStatus(retryAttempt > 0 ? 'reconnecting' : 'connecting', null);
    try {
      stream = createStream(baseUrl, handlers);
    } catch (error) {
      scheduleReconnect(
        error instanceof Error
          ? error
          : new Error('Não foi possível conectar ao fluxo de eventos.'),
      );
    }
  }

  openStream();

  return {
    close() {
      closed = true;
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = undefined;
      }
      stream?.close();
      stream = undefined;
      setConnectionStatus('disconnected', null);
    },
  };
}