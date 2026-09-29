import { transitionOrder } from '../src/store/ordersActions';
import {
  initialOrdersState,
  ordersReducer,
  selectOrders,
  type OrdersAction,
  type OrdersState,
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

function applyActions(initialState: OrdersState = initialOrdersState) {
  let state = initialState;
  const dispatch = (action: OrdersAction) => {
    state = ordersReducer(state, action);
  };
  return { dispatch, getState: () => state };
}

describe('orders store', () => {
  it('deduplicates orders in a snapshot by ID, keeping the latest value', () => {
    const updatedFirstOrder = { ...firstOrder, stage: 'CONFIRMED' as const };
    const state = ordersReducer(initialOrdersState, {
      type: 'snapshotReceived',
      orders: [firstOrder, secondOrder, updatedFirstOrder],
    });

    expect(state.ids).toEqual([1, 2]);
    expect(state.byId[1]).toEqual(updatedFirstOrder);
    expect(selectOrders(state)).toEqual([updatedFirstOrder, secondOrder]);
  });

  it('updates an existing order without duplicating its ID', () => {
    const loadedState = ordersReducer(initialOrdersState, {
      type: 'snapshotReceived',
      orders: [firstOrder],
    });
    const updatedOrder = { ...firstOrder, stage: 'PREPARING' as const };
    const state = ordersReducer(loadedState, {
      type: 'orderUpserted',
      order: updatedOrder,
    });

    expect(state.ids).toEqual([1]);
    expect(state.byId[1]).toEqual(updatedOrder);
  });

  it('adds a newly received order once', () => {
    const withFirstOrder = ordersReducer(initialOrdersState, {
      type: 'orderUpserted',
      order: firstOrder,
    });
    const withSecondOrder = ordersReducer(withFirstOrder, {
      type: 'orderUpserted',
      order: secondOrder,
    });
    const state = ordersReducer(withSecondOrder, {
      type: 'orderUpserted',
      order: secondOrder,
    });

    expect(state.ids).toEqual([1, 2]);
    expect(selectOrders(state)).toHaveLength(2);
  });

  it('applies a valid stage only after REST confirms it', async () => {
    const { dispatch, getState } = applyActions(
      ordersReducer(initialOrdersState, {
        type: 'snapshotReceived',
        orders: [firstOrder],
      }),
    );
    const updatedOrder = { ...firstOrder, stage: 'CONFIRMED' as const };
    const updateOrderStage = jest.fn().mockResolvedValue(updatedOrder);

    await expect(
      transitionOrder(
        firstOrder.id,
        'CONFIRMED',
        getState,
        dispatch,
        { updateOrderStage },
      ),
    ).resolves.toEqual(updatedOrder);

    expect(updateOrderStage).toHaveBeenCalledWith(firstOrder.id, 'CONFIRMED');
    expect(getState().byId[firstOrder.id]).toEqual(updatedOrder);
    expect(getState().pendingOrderIds).toEqual([]);
  });

  it('rejects an invalid stage without calling REST', async () => {
    const { dispatch, getState } = applyActions(
      ordersReducer(initialOrdersState, {
        type: 'snapshotReceived',
        orders: [firstOrder],
      }),
    );
    const updateOrderStage = jest.fn();

    await expect(
      transitionOrder(
        firstOrder.id,
        'READY',
        getState,
        dispatch,
        { updateOrderStage },
      ),
    ).rejects.toThrow('Não é possível mover o pedido 1 de PENDING para READY.');

    expect(updateOrderStage).not.toHaveBeenCalled();
    expect(getState().byId[firstOrder.id].stage).toBe('PENDING');
  });
});
