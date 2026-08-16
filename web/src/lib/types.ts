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

export interface Order {
  id: string;
  order_number: string;
  package_id: string;
  package_name: string;
  amount: number;
  phone_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  fulfillment_status: FulfillmentStatus;
  created_at: string;
  updated_at: string;
  mpesa_transaction_id?: string | null;
  notes?: string | null;
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
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'super_admin';
  created_at: string;
}

export interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown>;
  created_at: string;
}
