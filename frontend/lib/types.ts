// Common types used across the application

export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  keycloakId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Shift {
  id: number;
  shiftDate: string;
  period: ShiftPeriod;
  startTime: string;
  endTime: string;
  needed?: number;
  assignments: ShiftAssignment[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ShiftAssignment {
  id: number;
  shiftId: number;
  employeeId: number;
  employee?: Employee;
  shift?: Shift;
  createdAt?: string;
}

export interface LeaveRequest {
  id: number;
  employeeId: number;
  employee?: Employee;
  employeeName?: string;
  startDate: string;
  endDate: string;
  type: LeaveType;
  status: LeaveStatus;
  reason?: string;
  createdAt: string;
  updatedAt?: string;
}

// Enums as TypeScript types
export type ShiftPeriod = 'MORNING' | 'AFTERNOON' | 'NIGHT';
export type LeaveType = 'VACATION' | 'SICK' | 'PERSONAL';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

// Display labels for enums
export const ShiftPeriodLabels: Record<ShiftPeriod, string> = {
  MORNING: 'Matin',
  AFTERNOON: 'Apres-midi',
  NIGHT: 'Nuit',
};

export const LeaveTypeLabels: Record<LeaveType, string> = {
  VACATION: 'Vacances',
  SICK: 'Maladie',
  PERSONAL: 'Personnel',
};

export const LeaveStatusLabels: Record<LeaveStatus, string> = {
  PENDING: 'En attente',
  APPROVED: 'Approuve',
  REJECTED: 'Rejete',
};

// Color classes for status badges
export const LeaveStatusColors: Record<LeaveStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  APPROVED: 'bg-green-100 text-green-800 border-green-200',
  REJECTED: 'bg-red-100 text-red-800 border-red-200',
};

export const ShiftPeriodColors: Record<ShiftPeriod, string> = {
  MORNING: '#4ade80', // green
  AFTERNOON: '#facc15', // yellow
  NIGHT: '#3b82f6', // blue
};

// API Response types
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  statusCode?: number;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
  timestamp?: string;
  path?: string;
}

// Form types
export interface CreateLeaveRequestDto {
  startDate: string;
  endDate: string;
  type: LeaveType;
  reason?: string;
}

export interface CreateShiftDto {
  shiftDate: string;
  period: ShiftPeriod;
  startTime: string;
  endTime: string;
  needed?: number;
}

export interface AssignShiftDto {
  employeeId: number;
}

// Keycloak token parsed data
export interface KeycloakTokenParsed {
  exp?: number;
  iat?: number;
  auth_time?: number;
  jti?: string;
  iss?: string;
  aud?: string | string[];
  sub?: string;
  typ?: string;
  azp?: string;
  session_state?: string;
  acr?: string;
  'allowed-origins'?: string[];
  realm_access?: {
    roles: string[];
  };
  resource_access?: {
    [key: string]: {
      roles: string[];
    };
  };
  scope?: string;
  sid?: string;
  email_verified?: boolean;
  name?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
}
