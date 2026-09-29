export type OrderOrigin =
  | 'POS'
  | 'WHATSAPP_AI'
  | 'IFOOD'
  | 'MARKETPLACE'
  | 'CARDAPIO_WEB'
  | 'CLIENTE_FIEL';

export type OrderStage =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'DONE'
  | 'CANCELED';

export type PaymentStatus = 'PAID' | 'NO_PAID';

export type ProductionArea = 'CHAPA' | 'FRITADEIRA' | 'MONTAGEM';

export interface OrderItemAttribute {
  name: string;
  items: Array<{ name: string }>;
}

export interface OrderItem {
  id: string;
  name: string;
  productionArea: ProductionArea;
  quantity: number;
  price: string;
  total: string;
  note: string | null;
  attributes: OrderItemAttribute[];
}

export interface Order {
  id: number;
  reference: string;
  origin: OrderOrigin;
  stage: OrderStage;
  status: PaymentStatus;
  table: number | null;
  total: string;
  created: string;
  updated: string;
  note: string | null;
  orderItems: OrderItem[];
}

export interface OrdersResponse {
  pagination: null;
  orders: Order[];
}