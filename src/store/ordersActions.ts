import { canTransitionOrderStage } from '../constants/orderLifecycle';
import type { OrdersApi } from '../services/ordersApi';
import type { Order, OrderStage } from '../types/order';
import type { OrdersAction, OrdersState } from './ordersReducer';

export class InvalidOrderTransitionError extends Error {
  constructor(
    orderId: number,
    currentStage: OrderStage | undefined,
    nextStage: OrderStage,
  ) {
    super(
      currentStage
        ? `Não é possível mover o pedido ${orderId} de ${currentStage} para ${nextStage}.`
        : `O pedido ${orderId} não está carregado no estado local.`,
    );
    this.name = 'InvalidOrderTransitionError';
  }
}

export class OrderUpdateInProgressError extends Error {
  constructor(orderId: number) {
    super(`O pedido ${orderId} já está sendo atualizado.`);
    this.name = 'OrderUpdateInProgressError';
  }
}

type Dispatch = (action: OrdersAction) => void;
type GetState = () => OrdersState;

export async function loadOrders(
  dispatch: Dispatch,
  api: Pick<OrdersApi, 'getOrders'>,
): Promise<Order[]> {
  dispatch({ type: 'loadStarted' });

  try {
    const orders = await api.getOrders();
    dispatch({ type: 'snapshotReceived', orders });
    return orders;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Não foi possível carregar os pedidos.';
    dispatch({ type: 'loadFailed', message });
    throw error;
  }
}

export async function transitionOrder(
  orderId: number,
  nextStage: OrderStage,
  getState: GetState,
  dispatch: Dispatch,
  api: Pick<OrdersApi, 'updateOrderStage'>,
): Promise<Order> {
  const state = getState();
  const order = state.byId[orderId];

  if (!order || !canTransitionOrderStage(order.stage, nextStage)) {
    throw new InvalidOrderTransitionError(
      orderId,
      order?.stage,
      nextStage,
    );
  }

  if (state.pendingOrderIds.includes(orderId)) {
    throw new OrderUpdateInProgressError(orderId);
  }

  dispatch({ type: 'stageUpdateStarted', orderId });

  try {
    const updatedOrder = await api.updateOrderStage(orderId, nextStage);
    if (updatedOrder.id !== orderId || updatedOrder.stage !== nextStage) {
      throw new Error('O servidor retornou um estado inesperado para o pedido.');
    }
    dispatch({ type: 'stageUpdateSucceeded', order: updatedOrder });
    return updatedOrder;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Não foi possível atualizar o pedido.';
    dispatch({ type: 'stageUpdateFailed', orderId, message });
    throw error;
  }
}