import type { OrdersEventStreamHandlers } from '../src/services/ordersEventStream';
import {
  connectOrdersToStore,
  type OrdersStreamOptions,
} from '../src/store/ordersStream';
import {
  initialOrdersState,
  ordersReducer,
  type OrdersAction,
  type OrdersState,
} from '../src/store/ordersReducer';
import type { Order } from '../src/types/order';

const knownOrder: Order = {
  id: 1,
  reference: '#0001',
  origin: 'IFOOD',
  stage: 'PREPARING',
  status: 'PAID',
  table: null,
  total: '34.00',
  created: '2026-09-29T12:00:00',
  updated: '2026-09-29T12:00:00',
  note: null,
  orderItems: [],
};

interface MockConnection {
  handlers: OrdersEventStreamHandlers;
  close: jest.Mock;
}

describe('orders stream reconnection', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('keeps known orders and reconnects with capped exponential backoff', () => {
    jest.useFakeTimers();
    let state: OrdersState = ordersReducer(initialOrdersState, {
      type: 'snapshotReceived',
      orders: [knownOrder],
    });
    const dispatch = (action: OrdersAction) => {
      state = ordersReducer(state, action);
    };
    const connections: MockConnection[] = [];
    const createStream: NonNullable<OrdersStreamOptions['createStream']> = (
      _baseUrl,
      handlers,
    ) => {
      const connection = { handlers, close: jest.fn() };
      connections.push(connection);
      return { close: connection.close };
    };

    const stream = connectOrdersToStore(
      'http://mock.test',
      dispatch,
      {},
      { createStream, retryDelayMs: 1000, maxRetryDelayMs: 1500 },
    );

    expect(state.connectionStatus).toBe('connecting');
    connections[0].handlers.onError(new Error('Network unavailable'));

    expect(state.connectionStatus).toBe('reconnecting');
    expect(state.retryAttempt).toBe(1);
    expect(state.connectionError).toBe('Network unavailable');
    expect(state.byId[knownOrder.id]).toBe(knownOrder);
    expect(state.ids).toEqual([knownOrder.id]);
    expect(connections[0].close).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(999);
    expect(connections).toHaveLength(1);
    jest.advanceTimersByTime(1);
    expect(connections).toHaveLength(2);
    expect(state.connectionStatus).toBe('reconnecting');

    connections[1].handlers.onError(new Error('Still offline'));
    jest.advanceTimersByTime(1499);
    expect(connections).toHaveLength(2);
    jest.advanceTimersByTime(1);
    expect(connections).toHaveLength(3);
    expect(state.retryAttempt).toBe(2);

    connections[2].handlers.onOpen();
    expect(state.connectionStatus).toBe('connected');
    expect(state.retryAttempt).toBe(0);
    expect(state.connectionError).toBeNull();
    expect(state.byId[knownOrder.id]).toBe(knownOrder);

    stream.close();
    expect(state.connectionStatus).toBe('disconnected');
  });

  it('cancels a scheduled retry when the stream is closed', () => {
    jest.useFakeTimers();
    let state = initialOrdersState;
    const dispatch = (action: OrdersAction) => {
      state = ordersReducer(state, action);
    };
    const connections: MockConnection[] = [];
    const createStream: NonNullable<OrdersStreamOptions['createStream']> = (
      _baseUrl,
      handlers,
    ) => {
      const connection = { handlers, close: jest.fn() };
      connections.push(connection);
      return { close: connection.close };
    };

    const stream = connectOrdersToStore(
      'http://mock.test',
      dispatch,
      {},
      { createStream, retryDelayMs: 1000 },
    );
    connections[0].handlers.onError(new Error('Network unavailable'));
    stream.close();
    jest.advanceTimersByTime(1000);

    expect(connections).toHaveLength(1);
    expect(state.connectionStatus).toBe('disconnected');
  });
});
