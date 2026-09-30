import { applyOrdersEvent } from '../src/store/ordersEventHandler';
import {
  initialOrdersState,
  ordersReducer,
  type OrdersAction,
} from '../src/store/ordersReducer';
import type { Order } from '../src/types/order';

const firstOrder: Order = {
  id: 1,
  reference: '#0001',
  origin: 'IFOOD',
  stage: 'PENDING',
  status: 'PAID',
  table: null,
  total: '34.00',
  created: '2026-09-29T12:00:00',
  updated: '2026-09-29T12:00:00',
  note: null,
  orderItems: [],
};

const secondOrder: Order = {
  ...firstOrder,
  id: 2,
  reference: '#0002',
  stage: 'CONFIRMED',
};

describe('orders SSE events', () => {
  it('replaces local state with the snapshot', () => {
    let state = initialOrdersState;
    const dispatch = (action: OrdersAction) => {
      state = ordersReducer(state, action);
    };

    applyOrdersEvent(dispatch, 'snapshot', JSON.stringify([firstOrder]));

    expect(state.ids).toEqual([1]);
    expect(state.byId[1]).toEqual(firstOrder);
  });

  it('adds a new order from order.created', () => {
    let state = initialOrdersState;
    const dispatch = (action: OrdersAction) => {
      state = ordersReducer(state, action);
    };

    applyOrdersEvent(dispatch, 'order.created', JSON.stringify(secondOrder));

    expect(state.ids).toEqual([2]);
    expect(state.byId[2]).toEqual(secondOrder);
  });

  it('updates an order from order.updated without duplicating its ID', () => {
    let state = ordersReducer(initialOrdersState, {
      type: 'snapshotReceived',
      orders: [firstOrder],
    });
    const dispatch = (action: OrdersAction) => {
      state = ordersReducer(state, action);
    };
    const updatedOrder = { ...firstOrder, stage: 'CANCELED' as const };

    applyOrdersEvent(dispatch, 'order.updated', JSON.stringify(updatedOrder));

    expect(state.ids).toEqual([1]);
    expect(state.byId[1]).toEqual(updatedOrder);
  });

  it('is idempotent when the same created event arrives twice', () => {
    let state = initialOrdersState;
    const dispatch = (action: OrdersAction) => {
      state = ordersReducer(state, action);
    };
    const eventData = JSON.stringify(secondOrder);

    applyOrdersEvent(dispatch, 'order.created', eventData);
    applyOrdersEvent(dispatch, 'order.created', eventData);

    expect(state.ids).toEqual([2]);
    expect(state.byId[2]).toEqual(secondOrder);
  });

  it('rejects malformed event data without changing state', () => {
    let state = initialOrdersState;
    const dispatch = (action: OrdersAction) => {
      state = ordersReducer(state, action);
    };

    expect(() => applyOrdersEvent(dispatch, 'snapshot', '{bad json')).toThrow(
      'O evento snapshot contém JSON inválido.',
    );
    expect(state).toBe(initialOrdersState);
  });
});