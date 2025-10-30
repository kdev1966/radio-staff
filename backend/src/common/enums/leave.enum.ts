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
 */
export enum LeaveStatus {
  PENDING = 'PENDING',                        // En attente
  APPROVED_BY_MANAGER = 'APPROVED_BY_MANAGER', // Approuvé par le manager
  APPROVED = 'APPROVED',                       // Approuvé (RH)
  REJECTED = 'REJECTED',                       // Rejeté
}
