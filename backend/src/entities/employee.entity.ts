import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { LeaveRequest } from './leave-request.entity';
import { ShiftAssignment } from './shift-assignment.entity';
import { AuditLog } from './audit-log.entity';
import { RadiologyService } from './radiology-service.entity';
import { Permission, EmployeeType } from '../common/enums/permission.enum';

/**
 * Simplified Employee Role Enum
 */
export enum EmployeeRole {
  ADMIN = 'ADMIN',           // Chef de service - 1 par service
  RH = 'RH',                 // Ressources Humaines - permissions configurables
  EMPLOYE = 'EMPLOYE',       // Employé standard
}

@Entity('employees')
@Index(['serviceId', 'role']) // Pour vérifier contrainte 1 ADMIN par service
@Index(['serviceId', 'matricule'], { unique: true }) // Matricule unique par service
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Multi-tenant: FK vers RadiologyService
  @Column({ name: 'service_id', type: 'uuid' })
  @Index()
  serviceId!: string;

  @ManyToOne(() => RadiologyService, (service) => service.employees, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'service_id' })
  service!: RadiologyService;

  @Column()
  matricule!: string;

  @Column({ name: 'first_name' })
  firstName!: string;

  @Column({ name: 'last_name' })
  lastName!: string;

  @Column({ type: 'date', name: 'birth_date' })
  birthDate!: Date;

  @Column()
  phone!: string;

  @Column({
    type: 'enum',
    enum: EmployeeRole,
  })
  role!: EmployeeRole;

  // Type d'employé (pour EMPLOYE uniquement)
  @Column({
    type: 'enum',
    enum: EmployeeType,
    nullable: true,
    name: 'employee_type',
  })
  employeeType?: EmployeeType;

  // Permissions granulaires pour RH (array JSON)
  @Column({
    type: 'simple-array',
    nullable: true,
  })
  permissions?: Permission[];

  @Column()
  address!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ select: false })
  password!: string;

  // Archivage/Transfert
  @Column({ default: true, name: 'is_active' })
  isActive!: boolean;

  @Column({ type: 'uuid', nullable: true, name: 'previous_service_id' })
  previousServiceId?: string;

  @Column({ type: 'timestamp', nullable: true, name: 'transferred_at' })
  transferredAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations
  @OneToMany(() => LeaveRequest, (leaveRequest) => leaveRequest.employee)
  leaveRequests?: LeaveRequest[];

  @OneToMany(() => ShiftAssignment, (assignment) => assignment.employee)
  assignments?: ShiftAssignment[];

  @OneToMany(() => AuditLog, (auditLog) => auditLog.employee)
  auditLogs?: AuditLog[];
}
