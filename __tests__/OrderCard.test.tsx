import React from 'react';
import { Alert, Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { OrderCard } from '../src/components/OrderCard';
import type { Order } from '../src/types/order';

const order: Order = {
  id: 15,
  reference: '#0015',
  origin: 'POS',
  stage: 'PENDING',
  status: 'NO_PAID',
  table: 4,
  total: '67.00',
  created: '2026-09-29T12:00:00',
  updated: '2026-09-29T12:00:00',
  note: 'Cliente com pressa',
  orderItems: [
    {
      id: '15-0',
      name: 'Smash Duplo Cheddar',
      productionArea: 'CHAPA',
      quantity: 2,
      price: '34.00',
      total: '68.00',
      note: 'Caprichar no ponto',
      attributes: [
        { name: 'Ponto da carne', items: [{ name: 'Mal passado' }] },
      ],
    },
  ],
};

const mountedRenderers: ReactTestRenderer.ReactTestRenderer[] = [];

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(async () => {
  await ReactTestRenderer.act(() => {
    mountedRenderers.splice(0).forEach(renderer => renderer.unmount());
  });
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function renderCard(
  stage = order.stage,
  isUpdating = false,
): Promise<ReactTestRenderer.ReactTestRenderer> {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <OrderCard
        order={{ ...order, stage }}
        isUpdating={isUpdating}
        onAdvance={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
  });
  mountedRenderers.push(renderer);
  return renderer;
}

describe('OrderCard', () => {
  it('shows the order identity, wait timer, items, customizations, and notes', async () => {
    const renderer = await renderCard();
    const renderedText = renderer.root
      .findAllByType(Text)
      .map(text => text.props.children)
      .flat()
      .join(' ')
      .replace(/\s+/g, ' ');

    expect(renderedText).toContain('#0015');
    expect(renderedText).toContain('BALCÃO · MESA 4');
    expect(renderedText).toContain('NOVO');
    expect(renderedText).toContain('2 x');
    expect(renderedText).toContain('Smash Duplo Cheddar');
    expect(renderedText).toContain('Ponto da carne : Mal passado');
    expect(renderedText).toContain('Cliente com pressa');
    expect(renderedText).toContain('Caprichar no ponto');
    expect(renderedText).toContain('PAGAMENTO PENDENTE');

  });

  it('offers only the next valid stage action for an active order', async () => {
    const onAdvance = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <OrderCard
          order={order}
          isUpdating={false}
          onAdvance={onAdvance}
          onCancel={jest.fn()}
        />,
      );
    });
    mountedRenderers.push(renderer);

    const advanceButton = renderer.root.findByProps({
      accessibilityLabel: 'Aceitar pedido #0015',
    });
    await ReactTestRenderer.act(() => advanceButton.props.onPress());

    expect(onAdvance).toHaveBeenCalledWith(15, 'CONFIRMED');
    expect(
      renderer.root.findByProps({
        accessibilityLabel: 'Cancelar pedido #0015',
      }),
    ).toBeTruthy();

  });

  it('requires confirmation before canceling', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const onCancel = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <OrderCard
          order={order}
          isUpdating={false}
          onAdvance={jest.fn()}
          onCancel={onCancel}
        />,
      );
    });
    mountedRenderers.push(renderer);

    await ReactTestRenderer.act(() =>
      renderer.root
        .findByProps({ accessibilityLabel: 'Cancelar pedido #0015' })
        .props.onPress(),
    );
    expect(alertSpy).toHaveBeenCalledWith(
      'Cancelar pedido?',
      'Confirme o cancelamento do pedido #0015.',
      expect.any(Array),
    );

    const actions = alertSpy.mock.calls[0][2];
    const confirmAction = actions?.find(action => action.text === 'Cancelar pedido');
    await ReactTestRenderer.act(() => confirmAction?.onPress?.());
    expect(onCancel).toHaveBeenCalledWith(15);

  });

  it('does not offer transitions for terminal orders and disables pending actions', async () => {
    const doneRenderer = await renderCard('DONE');
    expect(
      doneRenderer.root.findAllByProps({ accessibilityRole: 'button' }),
    ).toHaveLength(0);

    const updatingRenderer = await renderCard('PENDING', true);
    const updateButton = updatingRenderer.root.findByProps({
      accessibilityLabel: 'Aceitar pedido #0015',
    });
    expect(updateButton.props.disabled).toBe(true);
    const cancelButton = updatingRenderer.root.findByProps({
      accessibilityLabel: 'Cancelar pedido #0015',
    });
    expect(cancelButton.props.disabled).toBe(true);
  });
});