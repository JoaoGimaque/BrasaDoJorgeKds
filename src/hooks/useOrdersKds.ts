import { useCallback, useEffect, useReducer, useRef } from 'react';
import { API_BASE_URL } from '../constants/api';
import { createOrdersApi } from '../services/ordersApi';
import { loadOrders, transitionOrder } from '../store/ordersActions';
import {
  initialOrdersState,
  ordersReducer,
} from '../store/ordersReducer';
import { connectOrdersToStore } from '../store/ordersStream';
import type { OrderStage } from '../types/order';

const ordersApi = createOrdersApi(API_BASE_URL);

export function useOrdersKds() {
  const [state, dispatch] = useReducer(ordersReducer, initialOrdersState);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    let active = true;
    let stream: ReturnType<typeof connectOrdersToStore> | undefined;

    const initialize = async () => {
      try {
        await loadOrders(dispatch, ordersApi);
      } catch {
        // The SSE snapshot can still populate the dashboard after REST fails.
      }

      if (active) {
        stream = connectOrdersToStore(API_BASE_URL, dispatch);
      }
    };

    initialize().catch(() => undefined);

    return () => {
      active = false;
      stream?.close();
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      await loadOrders(dispatch, ordersApi);
    } catch {
      // Keep the last known orders and expose the error through the reducer.
    }
  }, []);

  const updateStage = useCallback(
    (orderId: number, stage: OrderStage) =>
      transitionOrder(
        orderId,
        stage,
        () => stateRef.current,
        dispatch,
        ordersApi,
      ),
    [],
  );

  return { state, refresh, updateStage };
}