/**
 * Audit logging helper
 * Centralized audit log insertion used by admin endpoints
 */

import { supabaseAdmin } from './supabase.ts';

/**
 * Logs an admin action to audit_logs
 * @param action - action identifier (e.g., 'admin_verify_payment')
 * @param actor - admin email or 'system'
 * @param entityType - type of entity (e.g., 'order', 'package')
 * @param entityId - UUID of the affected entity
 * @param details - JSON object with action details
 * @param ipAddress - IP address of the actor
 */
export async function logAuditAdmin(
  action: string,
  actor: string,
  entityType: string,
  entityId: string,
  details: Record<string, unknown>,
  ipAddress: string
): Promise<void> {
  try {
    await supabaseAdmin.from('audit_logs').insert({
      action,
      actor,
      entity_type: entityType,
      entity_id: entityId,
      details,
      ip_address: ipAddress,
    });
  } catch (err) {
    console.error('Failed to log audit:', err);
  }
}

/**
 * General audit log helper (for non-admin actions)
 */
export async function logAudit(
  action: string,
  actor: string,
  entityType: string,
  details: Record<string, unknown>,
  ipAddress: string
): Promise<void> {
  try {
    await supabaseAdmin.from('audit_logs').insert({
      action,
      actor,
      entity_type: entityType,
      details,
      ip_address: ipAddress,
    });
  } catch (err) {
    console.error('Failed to log audit:', err);
  }
}
