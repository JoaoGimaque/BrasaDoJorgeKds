import {
  connectOrdersEventStream,
  type OrdersEventStream,
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
  onClose?(): void;
}

export function connectOrdersToStore(
  baseUrl: string,
  dispatch: Dispatch,
  statusHandlers: OrdersStreamStatusHandlers = {},
): OrdersEventStream {
  const handleEvent = (eventName: OrdersEventName, data: string | null) => {
    try {
      applyOrdersEvent(dispatch, eventName, data);
    } catch (error) {
      statusHandlers.onError?.(
        error instanceof Error
          ? error
          : new Error('Não foi possível processar um evento de pedido.'),
      );
    }
  };

  return connectOrdersEventStream(baseUrl, {
    onSnapshot: data => handleEvent('snapshot', data),
    onOrderCreated: data => handleEvent('order.created', data),
    onOrderUpdated: data => handleEvent('order.updated', data),
    onOpen: () => statusHandlers.onOpen?.(),
    onError: error => statusHandlers.onError?.(error),
    onClose: () => statusHandlers.onClose?.(),
  });
}