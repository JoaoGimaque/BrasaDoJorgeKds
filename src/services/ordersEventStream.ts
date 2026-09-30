import EventSource, {
  type EventSourceOptions,
  type EventSourceListener,
} from 'react-native-sse';
import type { OrdersEventName } from '../store/ordersEventHandler';

export interface OrdersEventStreamHandlers {
  onSnapshot(data: string | null): void;
  onOrderCreated(data: string | null): void;
  onOrderUpdated(data: string | null): void;
  onOpen(): void;
  onError(error: Error): void;
  onClose(): void;
}

export interface OrdersEventStream {
  close(): void;
}

export type OrdersEventSourceFactory = (
  url: string,
  options: EventSourceOptions,
) => EventSource<OrdersEventName>;

function toError(error: unknown): Error {
  const message =
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
      ? error.message
      : 'A conexão de eventos foi interrompida.';
  return new Error(message);
}

export function connectOrdersEventStream(
  baseUrl: string,
  handlers: OrdersEventStreamHandlers,
  createEventSource: OrdersEventSourceFactory = (url, options) =>
    new EventSource<OrdersEventName>(url, options),
): OrdersEventStream {
  const eventSource = createEventSource(`${baseUrl}/events`, {
    pollingInterval: 0,
    timeoutBeforeConnection: 0,
  });

  const onOpen: EventSourceListener<OrdersEventName, 'open'> = () => {
    handlers.onOpen();
  };
  const onSnapshot: EventSourceListener<OrdersEventName, 'snapshot'> = event => {
    handlers.onSnapshot(event.data);
  };
  const onOrderCreated: EventSourceListener<
    OrdersEventName,
    'order.created'
  > = event => {
    handlers.onOrderCreated(event.data);
  };
  const onOrderUpdated: EventSourceListener<
    OrdersEventName,
    'order.updated'
  > = event => {
    handlers.onOrderUpdated(event.data);
  };
  const onError: EventSourceListener<OrdersEventName, 'error'> = event => {
    handlers.onError(toError(event));
  };
  const onClose: EventSourceListener<OrdersEventName, 'close'> = () => {
    handlers.onClose();
  };

  eventSource.addEventListener('open', onOpen);
  eventSource.addEventListener('snapshot', onSnapshot);
  eventSource.addEventListener('order.created', onOrderCreated);
  eventSource.addEventListener('order.updated', onOrderUpdated);
  eventSource.addEventListener('error', onError);
  eventSource.addEventListener('close', onClose);

  return {
    close() {
      eventSource.removeAllEventListeners();
      eventSource.close();
    },
  };
}