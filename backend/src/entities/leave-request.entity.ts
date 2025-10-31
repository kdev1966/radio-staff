import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Employee } from './employee.entity';
import { RadiologyService } from './radiology-service.entity';
import { LeaveType, LeaveStatus } from '../common/enums/leave.enum';

@Entity('leave_requests')
@Index(['serviceId', 'startDate', 'endDate']) // Pour recherches par service et période
export class LeaveRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Multi-tenant: FK vers RadiologyService
  @Column({ name: 'service_id', type: 'uuid' })
  @Index()
  serviceId!: string;

  @ManyToOne(() => RadiologyService, (service) => service.leaveRequests, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'service_id' })
  service!: RadiologyService;

  @Column({ name: 'employee_id', type: 'uuid' })
  @Index()
  employeeId!: string;

  @ManyToOne(() => Employee, (employee) => employee.leaveRequests, {
    onDelete: 'CASCADE',
  })
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

  @Column({ type: 'text', nullable: true })
  comment?: string;

  @CreateDateColumn({ name: 'requested_at' })
  requestedAt!: Date;

  // Workflow: RH approval
  @Column({ type: 'timestamp', nullable: true, name: 'rh_reviewed_at' })
  rhReviewedAt?: Date;

  @Column({ type: 'uuid', nullable: true, name: 'rh_reviewed_by' })
  rhReviewedBy?: string;

  @Column({ type: 'text', nullable: true, name: 'rh_comment' })
  rhComment?: string;

  // Workflow: ADMIN final approval
  @Column({ type: 'timestamp', nullable: true, name: 'admin_reviewed_at' })
  adminReviewedAt?: Date;

  @Column({ type: 'uuid', nullable: true, name: 'admin_reviewed_by' })
  adminReviewedBy?: string;

  @Column({ type: 'text', nullable: true, name: 'admin_comment' })
  adminComment?: string;

  // Rejection
  @Column({ type: 'timestamp', nullable: true, name: 'rejected_at' })
  rejectedAt?: Date;

  @Column({ type: 'uuid', nullable: true, name: 'rejected_by' })
  rejectedBy?: string;

  @Column({ type: 'text', nullable: true, name: 'rejection_reason' })
  rejectionReason?: string;
}
