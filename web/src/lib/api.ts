import type { Order, Package, AdminUser, AuditLog } from './types';

// ===== API client for Supabase Edge Functions =====

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const FUNCTION_BASE = `${SUPABASE_URL}/functions/v1`;

function getHeaders(authToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
  };
  if (authToken) {
    headers['x-admin-token'] = authToken;
  }
  return headers;
}

async function callFunction<T>(
  name: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: Record<string, unknown>;
    authToken?: string;
  } = {}
): Promise<T> {
  const { method = 'POST', body, authToken } = options;

  const response = await fetch(`${FUNCTION_BASE}/${name}`, {
    method,
    headers: getHeaders(authToken),
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage: string;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error || errorJson.message || `Request failed: ${response.status}`;
    } catch {
      errorMessage = errorText || `Request failed: ${response.status}`;
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}

// ===== Public API =====

export async function createOrder(params: {
  packageId: string;
  phoneNumber: string;
}): Promise<{ order_number: string; order: Order }> {
  return callFunction('orders-create', { body: params });
}

export async function getOrderStatus(orderNumber: string, phone?: string): Promise<{ order: Order }> {
  return callFunction('orders-get', {
    body: { order_number: orderNumber, customer_phone: phone },
  });
}

export async function notifyPayment(params: {
  order_number: string;
  mpesa_transaction_id?: string;
  amount: number;
  phone_number: string;
}): Promise<{ success: boolean; message: string }> {
  return callFunction('payment-notify', { body: params });
}

export async function fetchPackages(): Promise<{ packages: Package[] }> {
  return callFunction('packages-list', { method: 'GET' });
}

// ===== Admin API =====

export async function adminLogin(params: {
  email: string;
  password: string;
}): Promise<{ token: string; user: AdminUser }> {
  return callFunction('admin-auth', { body: { action: 'login', ...params } });
}

export async function adminGetOrders(authToken: string): Promise<{ orders: Order[]; total?: number }> {
  return callFunction('admin-orders', { method: 'GET', authToken });
}

export async function adminUpdateOrder(
  authToken: string,
  params: {
    order_id: string;
    action: string;
  }
): Promise<{ order: Order }> {
  return callFunction('admin-orders', {
    method: 'PATCH',
    body: params,
    authToken,
  });
}

export async function adminGetPackages(authToken: string): Promise<{ packages: Package[] }> {
  return callFunction('admin-packages', { method: 'GET', authToken });
}

export async function adminCreatePackage(
  authToken: string,
  pkg: Partial<Package>
): Promise<{ package: Package }> {
  return callFunction('admin-packages', {
    body: pkg as unknown as Record<string, unknown>,
    authToken,
  });
}

export async function adminUpdatePackage(
  authToken: string,
  params: { id: string; updates: Partial<Package> }
): Promise<{ package: Package }> {
  return callFunction('admin-packages', {
    method: 'PATCH',
    body: params as unknown as Record<string, unknown>,
    authToken,
  });
}

export async function adminDeletePackage(
  authToken: string,
  params: { id: string }
): Promise<{ success: boolean }> {
  return callFunction('admin-packages', {
    method: 'DELETE',
    body: params,
    authToken,
  });
}

export async function adminGetAuditLogs(authToken: string): Promise<{ logs: AuditLog[] }> {
  return callFunction('admin-audit', { method: 'GET', authToken });
}
