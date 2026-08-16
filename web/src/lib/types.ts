// ===== Types for DATA SOLUTION app =====

export type PackageCategory = 'bingwa_data' | 'sms' | 'minutes' | 'highlighted' | 'tunukiwa';

export type PurchaseFrequency = 'buy_once' | 'buy_many';

export type BadgeType = 'BEST VALUE' | 'POPULAR' | 'LIMITED TIME' | 'BUY MANY TIMES' | null;

export type OrderStatus =
  | 'awaiting_payment'
  | 'payment_verification'
  | 'payment_confirmed'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'verified' | 'failed' | 'reversed';

export type FulfillmentStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Package {
  id: string;
  name: string;
  category: PackageCategory;
  price: number;
  description?: string;
  validity: string;
  purchase_frequency: PurchaseFrequency;
  active?: boolean;
  featured: boolean;
  badge?: BadgeType;
  start_time?: string | null;
  end_time?: string | null;
}

// Public order (from orders-get edge function)
export interface Order {
  order_number: string;
  package_name: string;
  amount: number;
  customer_phone: string;
  payment_status: OrderStatus;
  fulfillment_status: FulfillmentStatus;
  created_at: string;
}

// Admin order (from admin-orders edge function — full DB record)
export interface AdminOrder {
  id: string;
  order_number: string;
  customer_phone: string;
  package_id: string;
  package_name: string;
  amount: number;
  payment_status: OrderStatus;
  fulfillment_status: FulfillmentStatus;
  provider_reference?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  amount: number;
  phone_number: string;
  status: PaymentStatus;
  mpesa_transaction_id?: string | null;
  created_at: string;
}

export interface AdminUser {
  email: string;
  token?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  actor: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown>;
  ip_address: string;
  created_at: string;
}
