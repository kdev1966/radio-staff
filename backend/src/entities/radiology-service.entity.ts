import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { Employee } from './employee.entity';
import { Shift } from './shift.entity';
import { LeaveRequest } from './leave-request.entity';
import { SubscriptionTier, ServiceStatus } from '../common/enums/permission.enum';

@Entity('radiology_services')
export class RadiologyService {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  @Index()
  name!: string;

  @Column({ name: 'hospital_name' })
  hospitalName!: string;

  @Column({ nullable: true })
  address?: string;

  @Column({
    type: 'enum',
    enum: SubscriptionTier,
    default: SubscriptionTier.TRIAL,
  })
  subscriptionTier!: SubscriptionTier;

  @Column({
    type: 'enum',
    enum: ServiceStatus,
    default: ServiceStatus.TRIAL,
  })
  status!: ServiceStatus;

  @Column({ type: 'date', name: 'trial_ends_at', nullable: true })
  trialEndsAt?: Date;

  @Column({ type: 'date', name: 'subscription_ends_at', nullable: true })
  subscriptionEndsAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations
  @OneToMany(() => Employee, (employee) => employee.service)
  employees?: Employee[];

  @OneToMany(() => Shift, (shift) => shift.service)
  shifts?: Shift[];

  @OneToMany(() => LeaveRequest, (leaveRequest) => leaveRequest.service)
  leaveRequests?: LeaveRequest[];
}
