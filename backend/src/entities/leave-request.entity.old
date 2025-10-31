import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Employee } from './employee.entity';

export enum LeaveType {
  CP = 'CP',
  RTT = 'RTT',
  MALADIE = 'MALADIE',
  FORMATION = 'FORMATION',
  SPECIAL = 'SPECIAL',
}

export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED_BY_MANAGER = 'APPROVED_BY_MANAGER',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('leave_requests')
export class LeaveRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'employee_id' })
  employeeId!: string;

  @ManyToOne(() => Employee, (employee) => employee.leaveRequests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee?: Employee;

  @Column({ type: 'date', name: 'start_date' })
  startDate!: Date;

  @Column({ type: 'date', name: 'end_date' })
  endDate!: Date;

  @Column({ type: 'decimal', precision: 3, scale: 1 })
  days!: number;

  @Column({
    type: 'enum',
    enum: LeaveType,
  })
  type!: LeaveType;

  @Column({
    type: 'enum',
    enum: LeaveStatus,
    default: LeaveStatus.PENDING,
  })
  status!: LeaveStatus;

  @CreateDateColumn({ name: 'requested_at' })
  requestedAt!: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'manager_approved_at' })
  managerApprovedAt?: Date;

  @Column({ nullable: true, name: 'manager_approved_by' })
  managerApprovedBy?: string;

  @Column({ type: 'timestamp', nullable: true, name: 'hr_approved_at' })
  hrApprovedAt?: Date;

  @Column({ nullable: true, name: 'hr_approved_by' })
  hrApprovedBy?: string;

  @Column({ type: 'timestamp', nullable: true, name: 'rejected_at' })
  rejectedAt?: Date;

  @Column({ nullable: true, name: 'rejected_by' })
  rejectedBy?: string;

  @Column({ nullable: true, name: 'rejection_reason' })
  rejectionReason?: string;
}
