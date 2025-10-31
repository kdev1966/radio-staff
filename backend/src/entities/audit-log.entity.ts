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

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  ASSIGN_SHIFT = 'ASSIGN_SHIFT',
  APPROVE_LEAVE = 'APPROVE_LEAVE',
  REJECT_LEAVE = 'REJECT_LEAVE',
  TRANSFER_EMPLOYEE = 'TRANSFER_EMPLOYEE',
  ARCHIVE_EMPLOYEE = 'ARCHIVE_EMPLOYEE',
  CREATE_SERVICE = 'CREATE_SERVICE', // SUPER_ADMIN actions
  SUSPEND_SERVICE = 'SUSPEND_SERVICE',
  GRANT_PERMISSION = 'GRANT_PERMISSION',
}

@Entity('audit_logs')
@Index(['serviceId', 'timestamp']) // Pour recherches par service et date
@Index(['userId'])
@Index(['action'])
@Index(['statusCode'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Multi-tenant: FK vers RadiologyService (nullable pour actions SUPER_ADMIN)
  @Column({ name: 'service_id', type: 'uuid', nullable: true })
  @Index()
  serviceId?: string;

  @ManyToOne(() => RadiologyService, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'service_id' })
  service?: RadiologyService;

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action!: AuditAction;

  @Column({ name: 'entity_type' })
  entityType!: string;

  @Column({ type: 'varchar', nullable: true, name: 'entity_id' })
  entityId?: string;

  // userId peut être employeeId OU superAdminId
  @Column({ type: 'varchar', nullable: true, name: 'user_id' })
  userId?: string;

  @Column({ type: 'varchar', nullable: true })
  username?: string;

  @Column({ type: 'boolean', default: false, name: 'is_super_admin' })
  isSuperAdmin!: boolean;

  @ManyToOne(() => Employee, (employee) => employee.auditLogs, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'user_id' })
  employee?: Employee;

  @Column({ type: 'varchar', nullable: true })
  method?: string;

  @Column({ type: 'varchar', nullable: true })
  endpoint?: string;

  @Column({ type: 'int', nullable: true, name: 'status_code' })
  statusCode?: number;

  @Column({ type: 'int', nullable: true })
  duration?: number;

  @Column({ type: 'jsonb', nullable: true, name: 'request_body' })
  requestBody?: any;

  @Column({ type: 'jsonb', nullable: true, name: 'response_body' })
  responseBody?: any;

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  errorMessage?: string;

  @Column({ type: 'jsonb', nullable: true })
  details?: any;

  @Column({ type: 'varchar', nullable: true, name: 'ip_address' })
  ipAddress?: string;

  @Column({ type: 'text', nullable: true, name: 'user_agent' })
  userAgent?: string;

  @CreateDateColumn()
  timestamp!: Date;
}
