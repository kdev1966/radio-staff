import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { LeaveRequest } from './leave-request.entity';
import { ShiftAssignment } from './shift-assignment.entity';
import { AuditLog } from './audit-log.entity';

export enum EmployeeRole {
  TECHNICIEN = 'TECHNICIEN',
  ADMINISTRATIF = 'ADMINISTRATIF',
  ADMIN = 'ADMIN',
  CHEF_SERVICE = 'CHEF_SERVICE',
  RH = 'RH',
}

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
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

  @Column()
  address!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ select: false })
  password!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => LeaveRequest, (leaveRequest) => leaveRequest.employee)
  leaveRequests?: LeaveRequest[];

  @OneToMany(() => ShiftAssignment, (assignment) => assignment.employee)
  assignments?: ShiftAssignment[];

  @OneToMany(() => AuditLog, (auditLog) => auditLog.employee)
  auditLogs?: AuditLog[];
}
