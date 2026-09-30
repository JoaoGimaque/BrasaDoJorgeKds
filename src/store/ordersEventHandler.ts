import {
  parseOrderPayload,
  parseOrdersPayload,
} from '../services/ordersApi';
import type { OrdersAction } from './ordersReducer';

export type OrdersEventName = 'snapshot' | 'order.created' | 'order.updated';

type Dispatch = (action: OrdersAction) => void;

export function applyOrdersEvent(
  dispatch: Dispatch,
  eventName: OrdersEventName,
  data: string | null,
): void {
  if (!data) {
    throw new Error(`O evento ${eventName} chegou sem dados.`);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(data);
  } catch {
    throw new Error(`O evento ${eventName} contém JSON inválido.`);
  }

  if (eventName === 'snapshot') {
    dispatch({
      type: 'snapshotReceived',
      orders: parseOrdersPayload(payload),
    });
    return;
  }

  dispatch({
    type: 'orderUpserted',
    order: parseOrderPayload(payload),
  });
}