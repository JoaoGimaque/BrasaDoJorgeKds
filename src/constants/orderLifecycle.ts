import type { OrderStage } from '../types/order';

export const ORDER_TRANSITIONS: Record<OrderStage, readonly OrderStage[]> = {
  PENDING: ['CONFIRMED', 'CANCELED'],
  CONFIRMED: ['PREPARING', 'CANCELED'],
  PREPARING: ['READY', 'CANCELED'],
  READY: ['DONE', 'CANCELED'],
  DONE: [],
  CANCELED: [],
};

export function canTransitionOrderStage(
  currentStage: OrderStage,
  nextStage: OrderStage,
): boolean {
  return ORDER_TRANSITIONS[currentStage].includes(nextStage);
}

export function getNextOrderStage(
  currentStage: OrderStage,
): OrderStage | undefined {
  return ORDER_TRANSITIONS[currentStage].find(stage => stage !== 'CANCELED');
}