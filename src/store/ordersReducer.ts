import type { Order } from '../types/order';

export interface OrdersState {
  byId: Record<number, Order>;
  ids: number[];
  pendingOrderIds: number[];
  isLoading: boolean;
  error: string | null;
  connectionStatus: 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
  retryAttempt: number;
  connectionError: string | null;
}

export type OrdersAction =
  | { type: 'loadStarted' }
  | { type: 'snapshotReceived'; orders: Order[] }
  | { type: 'loadFailed'; message: string }
  | { type: 'orderUpserted'; order: Order }
  | { type: 'stageUpdateStarted'; orderId: number }
  | { type: 'stageUpdateSucceeded'; order: Order }
  | { type: 'stageUpdateFailed'; orderId: number; message: string }
  | {
      type: 'connectionStatusChanged';
      status: OrdersState['connectionStatus'];
      retryAttempt: number;
      message: string | null;
    };

export const initialOrdersState: OrdersState = {
  byId: {},
  ids: [],
  pendingOrderIds: [],
  isLoading: false,
  error: null,
  connectionStatus: 'connecting',
  retryAttempt: 0,
  connectionError: null,
};

function upsertOrder(state: OrdersState, order: Order): OrdersState {
  const isNewOrder = !Object.prototype.hasOwnProperty.call(state.byId, order.id);

  return {
    ...state,
    byId: { ...state.byId, [order.id]: order },
    ids: isNewOrder ? [...state.ids, order.id] : state.ids,
  };
}

function removePendingOrder(state: OrdersState, orderId: number): number[] {
  return state.pendingOrderIds.filter(id => id !== orderId);
}

export function ordersReducer(
  state: OrdersState,
  action: OrdersAction,
): OrdersState {
  switch (action.type) {
    case 'loadStarted':
      return { ...state, isLoading: true, error: null };
    case 'snapshotReceived': {
      const byId: Record<number, Order> = {};
      const ids: number[] = [];

      for (const order of action.orders) {
        if (!Object.prototype.hasOwnProperty.call(byId, order.id)) {
          ids.push(order.id);
        }
        byId[order.id] = order;
      }

      return { ...state, byId, ids, isLoading: false, error: null };
    }
    case 'loadFailed':
      return { ...state, isLoading: false, error: action.message };
    case 'orderUpserted':
      return upsertOrder({ ...state, error: null }, action.order);
    case 'stageUpdateStarted':
      return {
        ...state,
        error: null,
        pendingOrderIds: state.pendingOrderIds.includes(action.orderId)
          ? state.pendingOrderIds
          : [...state.pendingOrderIds, action.orderId],
      };
    case 'stageUpdateSucceeded':
      return {
        ...upsertOrder(state, action.order),
        pendingOrderIds: removePendingOrder(state, action.order.id),
        error: null,
      };
    case 'stageUpdateFailed':
      return {
        ...state,
        pendingOrderIds: removePendingOrder(state, action.orderId),
        error: action.message,
      };
    case 'connectionStatusChanged':
      return {
        ...state,
        connectionStatus: action.status,
        retryAttempt: action.retryAttempt,
        connectionError: action.message,
      };
  }
}

export function selectOrders(state: OrdersState): Order[] {
  return state.ids.flatMap(id => (state.byId[id] ? [state.byId[id]] : []));
}

