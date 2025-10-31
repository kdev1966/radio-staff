/**
 * Leave Type Enum
 */
export enum LeaveType {
  CP = 'CP',                    // Congés payés
  RTT = 'RTT',                  // Réduction du temps de travail
  MALADIE = 'MALADIE',          // Congé maladie
  FORMATION = 'FORMATION',      // Formation
  SPECIAL = 'SPECIAL',          // Congé spécial
}

/**
 * Leave Status Enum
 * Workflow: EMPLOYE → RH → ADMIN
 */
export enum LeaveStatus {
  PENDING = 'PENDING',                     // En attente de validation RH
  APPROVED_BY_RH = 'APPROVED_BY_RH',       // Approuvé par RH, en attente ADMIN
  APPROVED = 'APPROVED',                   // Approuvé final par ADMIN
  REJECTED_BY_RH = 'REJECTED_BY_RH',       // Rejeté par RH
  REJECTED_BY_ADMIN = 'REJECTED_BY_ADMIN', // Rejeté par ADMIN
}
