import type { Order, AdminOrder, Package, AuditLog } from './types';

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

// Network-level fetch with timeout — avoids hanging forever on flaky mobile connections
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return true; // "Failed to fetch" / "Load failed"
  if (err instanceof DOMException && err.name === 'AbortError') return true; // timeout
  return false;
}

async function callFunction<T>(
  name: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: Record<string, unknown>;
    authToken?: string;
    queryParams?: Record<string, string>;
  } = {}
): Promise<T> {
  const { method = 'POST', body, authToken, queryParams } = options;

  let url = `${FUNCTION_BASE}/${name}`;
  if (queryParams) {
    const params = new URLSearchParams(queryParams).toString();
    url += `?${params}`;
  }

  const requestInit: RequestInit = {
    method,
    headers: getHeaders(authToken),
    body: body ? JSON.stringify(body) : undefined,
  };

  // Retry once on transient network failures (poor mobile signal, DNS blip, etc.)
  // Never retry once we've received an actual server response.
  let response: Response;
  try {
    response = await fetchWithTimeout(url, requestInit);
  } catch (err) {
    if (isNetworkError(err)) {
      try {
        response = await fetchWithTimeout(url, requestInit);
      } catch (retryErr) {
        if (isNetworkError(retryErr)) {
          throw new Error('Network error — please check your internet connection and try again.');
        }
        throw retryErr;
      }
    } else {
      throw err;
    }
  }

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
}): Promise<{ order_number: string; package_name: string; amount: number; phone: string; payment_status: string }> {
  return callFunction('orders-create', {
    body: {
      package_id: params.packageId,
      customer_phone: params.phoneNumber,
    },
  });
}

export async function getOrderStatus(orderNumber: string, phone: string): Promise<{ order: Order }> {
  return callFunction('orders-get', {
    method: 'GET',
    queryParams: {
      order_number: orderNumber,
      customer_phone: phone,
    },
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

export async function initiateStkPush(params: {
  order_number: string;
  customer_phone: string;
}): Promise<{ success: boolean; message: string; checkout_request_id: string; order_number: string }> {
  return callFunction('mpesa-stkpush', {
    body: {
      order_number: params.order_number,
      customer_phone: params.customer_phone,
    },
  });
}

export async function fetchPackages(): Promise<{ packages: Package[] }> {
  return callFunction('packages-list', { method: 'GET' });
}

// ===== Admin API =====

export async function adminLogin(params: {
  email: string;
  password: string;
}): Promise<{ token: string; email: string }> {
  return callFunction('admin-auth', { body: { action: 'login', ...params } });
}

export async function adminGetOrders(authToken: string): Promise<{ orders: AdminOrder[]; pagination?: { total: number; page: number; limit: number; total_pages: number } }> {
  return callFunction('admin-orders', { method: 'GET', authToken });
}

export async function adminUpdateOrder(
  authToken: string,
  params: {
    order_id: string;
    action: string;
  }
): Promise<{ order_id: string; order_number: string; payment_status: string; fulfillment_status: string }> {
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
