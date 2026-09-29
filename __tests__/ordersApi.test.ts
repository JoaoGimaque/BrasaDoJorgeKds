import { createOrdersApi, OrdersApiError } from '../src/services/ordersApi';
import type { Order } from '../src/types/order';

const sampleOrder: Order = {
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
  orderItems: [
    {
      id: '1-0',
      name: 'Smash Clássico',
      productionArea: 'CHAPA',
      quantity: 1,
      price: '34.00',
      total: '34.00',
      note: null,
      attributes: [],
    },
  ],
};

function createResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('orders API', () => {
  it('loads and validates the order collection', async () => {
    const fetchMock = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(
        createResponse({ pagination: null, orders: [sampleOrder] }),
      );
    const api = createOrdersApi('http://mock.test', fetchMock);

    await expect(api.getOrders()).resolves.toEqual([sampleOrder]);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://mock.test/orders',
      undefined,
    );
  });

  it('loads one order by ID', async () => {
    const fetchMock = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(createResponse(sampleOrder));
    const api = createOrdersApi('http://mock.test', fetchMock);

    await expect(api.getOrder(1)).resolves.toEqual(sampleOrder);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://mock.test/orders/1',
      undefined,
    );
  });

  it('sends stage updates using the mock PATCH contract', async () => {
    const updatedOrder = { ...sampleOrder, stage: 'CONFIRMED' as const };
    const fetchMock = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(createResponse(updatedOrder));
    const api = createOrdersApi('http://mock.test', fetchMock);

    await expect(api.updateOrderStage(1, 'CONFIRMED')).resolves.toEqual(
      updatedOrder,
    );
    expect(fetchMock).toHaveBeenCalledWith('http://mock.test/orders/1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: 'CONFIRMED' }),
    });
  });

  it('surfaces the mock error message and HTTP status', async () => {
    const fetchMock = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(createResponse({ error: 'Pedido não encontrado' }, 404));
    const api = createOrdersApi('http://mock.test', fetchMock);

    await expect(api.getOrder(42)).rejects.toMatchObject<
      Partial<OrdersApiError>
    >({
      message: 'Pedido não encontrado',
      status: 404,
    });
  });

  it('rejects a successful response with an invalid order shape', async () => {
    const fetchMock = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(createResponse({ pagination: null, orders: [{}] }));
    const api = createOrdersApi('http://mock.test', fetchMock);

    await expect(api.getOrders()).rejects.toThrow(
      'A API retornou uma lista de pedidos inválida.',
    );
  });
});