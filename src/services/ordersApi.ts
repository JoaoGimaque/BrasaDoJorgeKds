import type {
  Order,
  OrderOrigin,
  OrderStage,
  OrdersResponse,
  OrderItem,
  OrderItemAttribute,
  PaymentStatus,
  ProductionArea,
} from '../types/order';

export class OrdersApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'OrdersApiError';
  }
}

type FetchImplementation = typeof fetch;

export interface OrdersApi {
  getOrders(): Promise<Order[]>;
  getOrder(id: number): Promise<Order>;
  updateOrderStage(id: number, stage: OrderStage): Promise<Order>;
}

const ORDER_ORIGINS: readonly OrderOrigin[] = [
  'POS',
  'WHATSAPP_AI',
  'IFOOD',
  'MARKETPLACE',
  'CARDAPIO_WEB',
  'CLIENTE_FIEL',
];

const ORDER_STAGES: readonly OrderStage[] = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'DONE',
  'CANCELED',
];

const PAYMENT_STATUSES: readonly PaymentStatus[] = ['PAID', 'NO_PAID'];
const PRODUCTION_AREAS: readonly ProductionArea[] = [
  'CHAPA',
  'FRITADEIRA',
  'MONTAGEM',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringOrNull(value: unknown): value is string | null {
  return typeof value === 'string' || value === null;
}

function isAttribute(value: unknown): value is OrderItemAttribute {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    Array.isArray(value.items) &&
    value.items.every(
      item => isRecord(item) && typeof item.name === 'string',
    )
  );
}

function isOrderItem(value: unknown): value is OrderItem {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    PRODUCTION_AREAS.includes(value.productionArea as ProductionArea) &&
    typeof value.quantity === 'number' &&
    typeof value.price === 'string' &&
    typeof value.total === 'string' &&
    isStringOrNull(value.note) &&
    Array.isArray(value.attributes) &&
    value.attributes.every(isAttribute)
  );
}

function isOrder(value: unknown): value is Order {
  return (
    isRecord(value) &&
    typeof value.id === 'number' &&
    typeof value.reference === 'string' &&
    ORDER_ORIGINS.includes(value.origin as OrderOrigin) &&
    ORDER_STAGES.includes(value.stage as OrderStage) &&
    PAYMENT_STATUSES.includes(value.status as PaymentStatus) &&
    (typeof value.table === 'number' || value.table === null) &&
    typeof value.total === 'string' &&
    typeof value.created === 'string' &&
    typeof value.updated === 'string' &&
    isStringOrNull(value.note) &&
    Array.isArray(value.orderItems) &&
    value.orderItems.every(isOrderItem)
  );
}

function parseOrder(value: unknown): Order {
  if (!isOrder(value)) {
    throw new OrdersApiError('A API retornou um pedido em formato inválido.');
  }
  return value;
}

export function parseOrderPayload(value: unknown): Order {
  return parseOrder(value);
}

export function parseOrdersPayload(value: unknown): Order[] {
  if (!Array.isArray(value) || !value.every(isOrder)) {
    throw new OrdersApiError('A API retornou uma lista de pedidos inválida.');
  }
  return value;
}

function parseOrdersResponse(value: unknown): OrdersResponse {
  if (
    !isRecord(value) ||
    value.pagination !== null ||
    !Array.isArray(value.orders)
  ) {
    throw new OrdersApiError('A API retornou uma lista de pedidos inválida.');
  }

  return { pagination: null, orders: parseOrdersPayload(value.orders) };
}

export function createOrdersApi(
  baseUrl: string,
  fetchImplementation: FetchImplementation = fetch,
): OrdersApi {
  async function request(path: string, init?: RequestInit): Promise<unknown> {
    let response: Response;

    try {
      response = await fetchImplementation(`${baseUrl}${path}`, init);
    } catch {
      throw new OrdersApiError('Não foi possível conectar ao servidor.');
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new OrdersApiError(
        'O servidor retornou uma resposta inválida.',
        response.status,
      );
    }

    if (!response.ok) {
      const message =
        isRecord(body) && typeof body.error === 'string'
          ? body.error
          : 'Não foi possível concluir a operação.';
      throw new OrdersApiError(message, response.status);
    }

    return body;
  }

  return {
    async getOrders(): Promise<Order[]> {
      const body = await request('/orders');
      return parseOrdersResponse(body).orders;
    },

    async getOrder(id: number): Promise<Order> {
      const body = await request(`/orders/${id}`);
      return parseOrder(body);
    },

    async updateOrderStage(id: number, stage: OrderStage): Promise<Order> {
      const body = await request(`/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
      });
      return parseOrder(body);
    },
  };
}