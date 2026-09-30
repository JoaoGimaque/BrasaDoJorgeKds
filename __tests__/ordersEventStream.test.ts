import type EventSource from 'react-native-sse';
import {
  connectOrdersEventStream,
  type OrdersEventSourceFactory,
  type OrdersEventStreamHandlers,
} from '../src/services/ordersEventStream';
import type { OrdersEventName } from '../src/store/ordersEventHandler';

describe('orders event stream adapter', () => {
  it('disables library retries and releases the EventSource on close', () => {
    const eventSource = {
      addEventListener: jest.fn(),
      removeAllEventListeners: jest.fn(),
      close: jest.fn(),
    } as unknown as EventSource<OrdersEventName>;
    const createEventSource: OrdersEventSourceFactory = jest.fn(
      () => eventSource,
    );
    const handlers: OrdersEventStreamHandlers = {
      onSnapshot: jest.fn(),
      onOrderCreated: jest.fn(),
      onOrderUpdated: jest.fn(),
      onOpen: jest.fn(),
      onError: jest.fn(),
      onClose: jest.fn(),
    };

    const stream = connectOrdersEventStream(
      'http://mock.test',
      handlers,
      createEventSource,
    );

    expect(createEventSource).toHaveBeenCalledWith(
      'http://mock.test/events',
      { pollingInterval: 0, timeoutBeforeConnection: 0 },
    );
    expect(eventSource.addEventListener).toHaveBeenCalledTimes(6);

    stream.close();

    expect(eventSource.removeAllEventListeners).toHaveBeenCalledTimes(1);
    expect(eventSource.close).toHaveBeenCalledTimes(1);
  });
});
