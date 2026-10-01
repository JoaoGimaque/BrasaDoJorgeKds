import { memo, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getNextOrderStage } from '../constants/orderLifecycle';
import { formatWaitTime, getWaitSeconds } from '../utils/orderTime';
import type { Order, OrderStage } from '../types/order';

const STAGE_LABELS: Record<OrderStage, string> = {
  PENDING: 'NOVO',
  CONFIRMED: 'CONFIRMADO',
  PREPARING: 'EM PREPARO',
  READY: 'PRONTO',
  DONE: 'FINALIZADO',
  CANCELED: 'CANCELADO',
};

const NEXT_ACTION_LABELS: Partial<Record<OrderStage, string>> = {
  PENDING: 'Aceitar',
  CONFIRMED: 'Iniciar',
  PREPARING: 'Pronto',
  READY: 'Concluir',
};

const NEXT_ACTION_COLORS: Partial<Record<OrderStage, string>> = {
  PENDING: '#EAB308',
  CONFIRMED: '#3B82F6',
  PREPARING: '#8B5CF6',
  READY: '#22C55E',
};

const ORIGIN_LABELS: Record<Order['origin'], string> = {
  POS: 'BALCÃO',
  WHATSAPP_AI: 'WHATSAPP',
  IFOOD: 'IFOOD',
  MARKETPLACE: 'PIGZ',
  CARDAPIO_WEB: 'CARDÁPIO WEB',
  CLIENTE_FIEL: 'CLIENTE FIEL',
};

const STAGE_COLORS: Record<OrderStage, string> = {
  PENDING: '#EAB308',
  CONFIRMED: '#3B82F6',
  PREPARING: '#8B5CF6',
  READY: '#22C55E',
  DONE: '#64736B',
  CANCELED: '#ff1100',
};

interface OrderCardProps {
  order: Order;
  isUpdating: boolean;
  onAdvance(orderId: number, nextStage: OrderStage): void;
  onCancel(orderId: number): void;
}

function WaitTimer({ created }: { created: string }) {
  const [waitSeconds, setWaitSeconds] = useState(() => getWaitSeconds(created));

  useEffect(() => {
    const timer = setInterval(() => {
      setWaitSeconds(getWaitSeconds(created));
    }, 1000);
    return () => clearInterval(timer);
  }, [created]);

  const isLate = waitSeconds >= 15 * 60;
  const isCritical = waitSeconds >= 30 * 60;

  return (
    <View
      style={[
        styles.timer,
        isLate && styles.timerLate,
        isCritical && styles.timerCritical,
      ]}
      accessibilityLabel={`Tempo de espera ${formatWaitTime(waitSeconds)}`}
    >
      {isLate ? <Text style={styles.lateFlag}>ATRASADO</Text> : null}
      <Text style={styles.timerValue}>{formatWaitTime(waitSeconds)}</Text>
    </View>
  );
}

function OrderCardComponent({
  order,
  isUpdating,
  onAdvance,
  onCancel,
}: OrderCardProps) {
  const nextStage = getNextOrderStage(order.stage);
  const nextActionColor = nextStage ? NEXT_ACTION_COLORS[nextStage] ?? '#173C30' : '#173C30';
  const orderNotes = [
    order.note,
    ...order.orderItems.map(item => item.note),
  ].filter((note): note is string => Boolean(note));

  const confirmCancel = () => {
    Alert.alert(
      'Cancelar pedido?',
      `Confirme o cancelamento do pedido ${order.reference}.`,
      [
        { text: 'Voltar', style: 'cancel' },
        {
          text: 'Cancelar pedido',
          style: 'destructive',
          onPress: () => onCancel(order.id),
        },
      ],
    );
  };

  return (
    <View style={[styles.card, { borderTopColor: STAGE_COLORS[order.stage] }]}>
      <View style={styles.cardTop}>
        <View style={styles.orderIdentity}>
          <Text style={styles.reference}>{order.reference}</Text>
          <Text style={styles.origin}>
            {ORIGIN_LABELS[order.origin]}
            {order.table ? ` · MESA ${order.table}` : ''}
          </Text>
        </View>
        <WaitTimer created={order.created} />
      </View>

      <View style={styles.metaRow}>
        <View style={[styles.stageBadge, { backgroundColor: STAGE_COLORS[order.stage] }]}>
          <Text style={styles.stageText}>{STAGE_LABELS[order.stage]}</Text>
        </View>
        {order.status === 'NO_PAID' ? (
          <Text style={styles.paymentWarning}>PAGAMENTO PENDENTE</Text>
        ) : null}
      </View>

      <View style={styles.items}>
        {order.orderItems.map(item => (
          <View key={item.id} style={styles.itemRow}>
            <Text style={styles.quantity}>{item.quantity}x</Text>
            <View style={styles.itemDetails}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.productionArea}>{item.productionArea}</Text>
              {item.attributes.flatMap(attribute =>
                attribute.items.map((option, index) => (
                  <Text key={`${attribute.name}-${option.name}-${index}`} style={styles.attribute}>
                    {attribute.name}: {option.name}
                  </Text>
                )),
              )}
            </View>
          </View>
        ))}
      </View>

      {orderNotes.length > 0 ? (
        <View style={styles.noteBlock}>
          <Text style={styles.noteLabel}>ATENÇÃO</Text>
          {orderNotes.map((note, index) => (
            <Text key={`${note}-${index}`} style={styles.noteText}>
              {note}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={styles.actions}>
        {nextStage ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${NEXT_ACTION_LABELS[order.stage]} ${order.reference}`}
            disabled={isUpdating}
            onPress={() => onAdvance(order.id, nextStage)}
            style={({ pressed }) => [
              styles.primaryAction,
              { backgroundColor: nextActionColor },
              (pressed || isUpdating) && styles.actionMuted,
            ]}
          >
            <View style={styles.primaryActionContent}>
              <Text style={styles.primaryActionIcon}>✓</Text>
              <Text style={styles.primaryActionText}>
                {isUpdating ? 'Atualizando...' : NEXT_ACTION_LABELS[order.stage]}
              </Text>
            </View>
          </Pressable>
        ) : null}
        {nextStage ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Cancelar pedido ${order.reference}`}
            disabled={isUpdating}
            onPress={confirmCancel}
            style={({ pressed }) => [
              styles.cancelAction,
              (pressed || isUpdating) && styles.actionMuted,
            ]}
          >
            <View style={styles.cancelActionContent}>
              <Text style={styles.cancelActionIcon}>×</Text>
              <Text style={styles.cancelActionText}>Cancelar</Text>
            </View>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export const OrderCard = memo(OrderCardComponent);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    margin: 7,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 5,
    borderRadius: 5,
    borderColor: '#D9E0DC',
    borderWidth: 1,
  },
  cardTop: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  orderIdentity: {
    flex: 1,
    gap: 4,
  },
  reference: {
    color: '#15211C',
    fontSize: 28,
    fontWeight: '900',
  },
  origin: {
    color: '#59665F',
    fontSize: 12,
    fontWeight: '800',
  },
  timer: {
    minWidth: 88,
    minHeight: 54,
    paddingHorizontal: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EDF1EE',
    borderRadius: 4,
  },
  timerLate: {
    backgroundColor: '#FFF1D6',
  },
  timerCritical: {
    backgroundColor: '#FCE6E2',
  },
  timerValue: {
    color: '#18241E',
    fontSize: 21,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  lateFlag: {
    color: '#8A3E20',
    fontSize: 9,
    fontWeight: '900',
  },
  metaRow: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  stageBadge: {
    minHeight: 26,
    justifyContent: 'center',
    paddingHorizontal: 9,
    borderRadius: 3,
  },
  stageText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  paymentWarning: {
    color: '#9A3F30',
    fontSize: 10,
    fontWeight: '900',
  },
  items: {
    gap: 10,
    paddingTop: 12,
    borderTopColor: '#E7ECE8',
    borderTopWidth: 1,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  quantity: {
    minWidth: 34,
    color: '#237058',
    fontSize: 20,
    fontWeight: '900',
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    color: '#1B2721',
    fontSize: 17,
    fontWeight: '800',
  },
  productionArea: {
    marginTop: 2,
    color: '#6C7871',
    fontSize: 10,
    fontWeight: '800',
  },
  attribute: {
    marginTop: 3,
    color: '#46544C',
    fontSize: 13,
  },
  noteBlock: {
    marginTop: 14,
    padding: 10,
    backgroundColor: '#FFF4D9',
    borderLeftWidth: 4,
    borderLeftColor: '#B7791F',
  },
  noteLabel: {
    marginBottom: 3,
    color: '#795317',
    fontSize: 10,
    fontWeight: '900',
  },
  noteText: {
    color: '#493817',
    fontSize: 14,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  primaryAction: {
    minHeight: 52,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#173C30',
    borderRadius: 4,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
  cancelAction: {
    minHeight: 52,
    minWidth: 92,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderColor: '#C9D1CC',
    borderWidth: 1,
    borderRadius: 4,
  },
  cancelActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cancelActionIcon: {
    color: '#81463F',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 20,
  },
  cancelActionText: {
    color: '#81463F',
    fontSize: 13,
    fontWeight: '800',
  },
  actionMuted: {
    opacity: 0.55,
  },
  primaryActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryActionIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
});