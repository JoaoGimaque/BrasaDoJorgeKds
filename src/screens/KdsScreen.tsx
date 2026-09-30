import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OrderCard } from '../components/OrderCard';
import { useOrdersKds } from '../hooks/useOrdersKds';
import type { Order, OrderStage } from '../types/order';

type OrderFilter = 'ACTIVE' | OrderStage;

const FILTERS: Array<{ key: OrderFilter; label: string }> = [
  { key: 'ACTIVE', label: 'Fila ativa' },
  { key: 'PENDING', label: 'Novos' },
  { key: 'CONFIRMED', label: 'Confirmados' },
  { key: 'PREPARING', label: 'Em preparo' },
  { key: 'READY', label: 'Prontos' },
  { key: 'CANCELED', label: 'Cancelados' },
  { key: 'DONE', label: 'Finalizados' },
];

const CONNECTION_LABELS = {
  connecting: 'CONECTANDO',
  connected: 'AO VIVO',
  reconnecting: 'RECONCONECTANDO',
  disconnected: 'DESCONECTADO',
} as const;

function isActiveOrder(order: Order): boolean {
  return order.stage !== 'DONE' && order.stage !== 'CANCELED';
}

function ConnectionIndicator({ status }: { status: keyof typeof CONNECTION_LABELS }) {
  const isConnected = status === 'connected';
  const isReconnecting = status === 'reconnecting';

  return (
    <View
      accessibilityLabel={`Conexão ${CONNECTION_LABELS[status]}`}
      style={[
        styles.connectionBadge,
        isConnected && styles.connectionConnected,
        isReconnecting && styles.connectionReconnecting,
      ]}
    >
      <View
        style={[
          styles.connectionDot,
          isConnected && styles.connectionDotConnected,
          isReconnecting && styles.connectionDotReconnecting,
        ]}
      />
      <Text style={styles.connectionText}>{CONNECTION_LABELS[status]}</Text>
    </View>
  );
}

function KdsScreen() {
  const { state, refresh, updateStage } = useOrdersKds();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<OrderFilter>('ACTIVE');
  const [now, setNow] = useState(Date.now);
  const columnCount = width >= 1180 ? 3 : width >= 760 ? 2 : 1;
  const isCompact = width < 600;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const visibleOrders = useMemo(() => {
    const orders = state.ids
      .map(id => state.byId[id])
      .filter((order): order is Order => Boolean(order))
      .filter(order =>
        filter === 'ACTIVE' ? isActiveOrder(order) : order.stage === filter,
      );

    return orders.sort((first, second) => {
      const firstTime = Date.parse(`${first.created}Z`);
      const secondTime = Date.parse(`${second.created}Z`);
      return firstTime - secondTime;
    });
  }, [filter, state.byId, state.ids]);

  const activeCount = state.ids.reduce((count, id) => {
    const order = state.byId[id];
    return count + (order && isActiveOrder(order) ? 1 : 0);
  }, 0);
  const lateCount = state.ids.reduce((count, id) => {
    const order = state.byId[id];
    if (!order || !isActiveOrder(order)) {
      return count;
    }
    const createdAt = Date.parse(`${order.created}Z`);
    return count + (now - createdAt >= 15 * 60 * 1000 ? 1 : 0);
  }, 0);

  const advanceOrder = useCallback(
    (orderId: number, stage: OrderStage) => {
      updateStage(orderId, stage).catch(() => undefined);
    },
    [updateStage],
  );

  const cancelOrder = useCallback(
    (orderId: number) => {
      updateStage(orderId, 'CANCELED').catch(() => undefined);
    },
    [updateStage],
  );

  const renderOrder = useCallback(
    ({ item }: { item: Order }) => (
      <OrderCard
        order={item}
        isUpdating={state.pendingOrderIds.includes(item.id)}
        onAdvance={advanceOrder}
        onCancel={cancelOrder}
      />
    ),
    [advanceOrder, cancelOrder, state.pendingOrderIds],
  );

  const emptyState = state.isLoading ? (
    <View style={styles.emptyState}>
      <ActivityIndicator color="#286C54" size="large" />
      <Text style={styles.emptyTitle}>Carregando pedidos</Text>
    </View>
  ) : state.error && state.ids.length === 0 ? (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>Não foi possível carregar a cozinha</Text>
      <Text style={styles.emptyDescription}>{state.error}</Text>
      <Pressable onPress={() => refresh().catch(() => undefined)} style={styles.retryButton}>
        <Text style={styles.retryButtonText}>Tentar novamente</Text>
      </Pressable>
    </View>
  ) : (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>
        {filter === 'ACTIVE' ? 'Fila limpa' : 'Nenhum pedido nesta etapa'}
      </Text>
      <Text style={styles.emptyDescription}>
        {filter === 'ACTIVE'
          ? 'Os novos pedidos aparecem aqui automaticamente.'
          : 'Escolha outra etapa para consultar os pedidos.'}
      </Text>
    </View>
  );

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <View style={[styles.header, isCompact && styles.headerCompact]}>
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>BJ</Text>
        </View>
        <View style={styles.headerTitleBlock}>
          <Text style={[styles.eyebrow, isCompact && styles.eyebrowCompact]}>
            BRASA DO JORGE · COZINHA
          </Text>
          <Text style={[styles.title, isCompact && styles.titleCompact]}>
            Painel de pedidos
          </Text>
        </View>
        <View style={[styles.headerRight, isCompact && styles.headerRightCompact]}>
          <ConnectionIndicator status={state.connectionStatus} />
          <Pressable
            accessibilityRole="button"
            onPress={() => refresh().catch(() => undefined)}
            style={({ pressed }) => [
              styles.refreshButton,
              isCompact && styles.refreshButtonCompact,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.refreshButtonText, isCompact && styles.refreshTextCompact]}>
              Atualizar
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.summaryRow, isCompact && styles.summaryRowCompact]}>
        <View style={styles.summaryBlock}>
          <Text style={styles.summaryValue}>{activeCount}</Text>
          <Text style={styles.summaryLabel}>NA FILA</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryBlock}>
          <Text style={[styles.summaryValue, lateCount > 0 && styles.lateSummaryValue]}>
            {lateCount}
          </Text>
          <Text style={styles.summaryLabel}>ACIMA DE 15 MIN</Text>
        </View>
        {state.connectionStatus === 'reconnecting' ? (
          <Text style={styles.reconnectNote}>
            Tentativa {state.retryAttempt}
            {state.connectionError ? ` · ${state.connectionError}` : ''}
          </Text>
        ) : null}
      </View>

      {state.error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{state.error}</Text>
            <Pressable onPress={() => refresh().catch(() => undefined)} hitSlop={8}>
            <Text style={styles.errorAction}>Recarregar</Text>
          </Pressable>
        </View>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {FILTERS.map(item => {
          const selected = filter === item.key;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setFilter(item.key)}
              style={[styles.filterButton, selected && styles.filterSelected]}
            >
              <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
                {item.label}
              </Text>
              {item.key === 'ACTIVE' ? (
                <Text style={[styles.filterCount, selected && styles.filterTextSelected]}>
                  {activeCount}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList
        key={`orders-${columnCount}`}
        data={visibleOrders}
        numColumns={columnCount}
        keyExtractor={order => String(order.id)}
        renderItem={renderOrder}
        columnWrapperStyle={columnCount > 1 ? styles.orderRow : undefined}
        contentContainerStyle={[
          styles.listContent,
          visibleOrders.length === 0 && styles.listEmptyContent,
        ]}
        ListEmptyComponent={emptyState}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
      />
      <View style={styles.footer}>
        <Text style={styles.footerText}>ORDEM DE ESPERA · MAIS ANTIGOS PRIMEIRO</Text>
        <Text style={styles.footerText}>ATUALIZAÇÃO AUTOMÁTICA</Text>
      </View>
    </View>
  );
}

export default KdsScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#EEF2EF',
  },
  header: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 12,
    backgroundColor: '#13201B',
    borderBottomWidth: 4,
    borderBottomColor: '#CDE86B',
    gap: 13,
  },
  headerCompact: {
    minHeight: 72,
    paddingHorizontal: 10,
    gap: 7,
  },
  brandMark: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#CDE86B',
    borderRadius: 4,
  },
  brandMarkText: {
    color: '#13201B',
    fontSize: 18,
    fontWeight: '900',
  },
  headerTitleBlock: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    color: '#CDE86B',
    fontSize: 10,
    fontWeight: '900',
  },
  eyebrowCompact: {
    fontSize: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '900',
  },
  titleCompact: {
    fontSize: 17,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerRightCompact: {
    gap: 5,
  },
  connectionBadge: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    gap: 7,
    borderColor: '#52635A',
    borderWidth: 1,
    borderRadius: 4,
  },
  connectionConnected: {
    borderColor: '#70B996',
  },
  connectionReconnecting: {
    borderColor: '#E0B755',
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ADB8B1',
  },
  connectionDotConnected: {
    backgroundColor: '#71D29E',
  },
  connectionDotReconnecting: {
    backgroundColor: '#F0C35D',
  },
  connectionText: {
    color: '#F3F6F3',
    fontSize: 10,
    fontWeight: '900',
  },
  refreshButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 13,
    backgroundColor: '#26362E',
    borderColor: '#506057',
    borderWidth: 1,
    borderRadius: 4,
  },
  refreshButtonCompact: {
    minHeight: 36,
    paddingHorizontal: 7,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  refreshTextCompact: {
    fontSize: 10,
  },
  pressed: {
    opacity: 0.65,
  },
  summaryRow: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 25,
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#DDE4DF',
    borderBottomWidth: 1,
    gap: 20,
  },
  summaryRowCompact: {
    paddingHorizontal: 12,
    gap: 11,
  },
  summaryBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 9,
  },
  summaryValue: {
    color: '#18261F',
    fontSize: 27,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  lateSummaryValue: {
    color: '#A64B36',
  },
  summaryLabel: {
    color: '#69766F',
    fontSize: 10,
    fontWeight: '900',
  },
  summaryDivider: {
    height: 32,
    width: 1,
    backgroundColor: '#DDE4DF',
  },
  reconnectNote: {
    flex: 1,
    color: '#8B5E12',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  errorBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 11,
    backgroundColor: '#FCE9E5',
    borderBottomWidth: 1,
    borderBottomColor: '#E8C2B9',
    gap: 12,
  },
  errorText: {
    flex: 1,
    color: '#773C33',
    fontSize: 13,
    fontWeight: '700',
  },
  errorAction: {
    color: '#773C33',
    fontSize: 12,
    fontWeight: '900',
  },
  filters: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    gap: 8,
  },
  filterButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    backgroundColor: '#E2E8E4',
    borderWidth: 1,
    borderColor: '#D2DBD5',
    borderRadius: 4,
    gap: 8,
  },
  filterSelected: {
    backgroundColor: '#173C30',
    borderColor: '#173C30',
  },
  filterText: {
    color: '#34453B',
    fontSize: 12,
    fontWeight: '800',
  },
  filterTextSelected: {
    color: '#FFFFFF',
  },
  filterCount: {
    color: '#557064',
    fontSize: 11,
    fontWeight: '900',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  listEmptyContent: {
    flexGrow: 1,
  },
  orderRow: {
    alignItems: 'stretch',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  emptyTitle: {
    color: '#213128',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyDescription: {
    maxWidth: 420,
    color: '#68766E',
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginTop: 7,
    backgroundColor: '#173C30',
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  footer: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: '#E4EAE6',
    borderTopColor: '#D4DDD7',
    borderTopWidth: 1,
  },
  footerText: {
    color: '#728078',
    fontSize: 9,
    fontWeight: '900',
  },
});