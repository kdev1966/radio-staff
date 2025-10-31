/**
 * Granular Permissions Enum
 * Used for RH role to define specific capabilities
 */
export enum Permission {
  MANAGE_EMPLOYEES = 'manage_employees',
  MANAGE_LEAVES = 'manage_leaves',
  MANAGE_SHIFTS = 'manage_shifts',
  APPROVE_LEAVES = 'approve_leaves',
  EXPORT_PLANNING = 'export_planning',
  VIEW_AUDITS = 'view_audits',
}

/**
 * Subscription Tier Enum
 */
export enum SubscriptionTier {
  TRIAL = 'TRIAL',
  BASIC = 'BASIC',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

/**
 * Service Status Enum
 */
export enum ServiceStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  TRIAL = 'TRIAL',
  EXPIRED = 'EXPIRED',
}

/**
 * Employee Type Enum
 */
export enum EmployeeType {
  TECHNICIEN = 'TECHNICIEN',
  ADMINISTRATIF = 'ADMINISTRATIF',
}
