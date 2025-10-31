import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Employee } from './employee.entity';

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  ASSIGN_SHIFT = 'ASSIGN_SHIFT',
  APPROVE_LEAVE = 'APPROVE_LEAVE',
  REJECT_LEAVE = 'REJECT_LEAVE',
}

@Entity('audit_logs')
@Index(['userId'])
@Index(['action'])
@Index(['timestamp'])
@Index(['statusCode'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action!: AuditAction;

  @Column({ name: 'entity_type' })
  entityType!: string;

  @Column({ type: 'varchar', nullable: true, name: 'entity_id' })
  entityId?: string;

  @Column({ type: 'varchar', nullable: true, name: 'user_id' })
  userId?: string;

  @Column({ type: 'varchar', nullable: true })
  username?: string;

  @ManyToOne(() => Employee, (employee) => employee.auditLogs, { nullable: true })
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
