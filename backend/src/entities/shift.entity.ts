import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { ShiftAssignment } from './shift-assignment.entity';
import { ShiftPosition } from './shift-position.entity';
import { RadiologyService } from './radiology-service.entity';

export enum ShiftPeriod {
  MORNING = 'MORNING',
  AFTERNOON = 'AFTERNOON',
  NIGHT = 'NIGHT',
}

export enum DayType {
  NORMAL = 'NORMAL',
  WEEKEND_HOLIDAY = 'WEEKEND_HOLIDAY',
}

@Entity('shifts')
@Unique(['serviceId', 'shiftDate', 'period']) // Unique par service
@Index(['serviceId', 'shiftDate']) // Pour recherches par service et date
export class Shift {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Multi-tenant: FK vers RadiologyService
  @Column({ name: 'service_id', type: 'uuid' })
  @Index()
  serviceId!: string;

  @ManyToOne(() => RadiologyService, (service) => service.shifts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'service_id' })
  service!: RadiologyService;

  @Column({ type: 'date', name: 'shift_date' })
  shiftDate!: Date;

  @Column({
    type: 'enum',
    enum: ShiftPeriod,
  })
  period!: ShiftPeriod;

  @Column({ type: 'time', name: 'start_time' })
  startTime!: Date;

  @Column({ type: 'time', name: 'end_time' })
  endTime!: Date;

  @Column({
    type: 'enum',
    enum: DayType,
    name: 'day_type',
    default: DayType.NORMAL,
  })
  dayType!: DayType;

  @Column({ default: 1 })
  needed!: number;

  @OneToMany(() => ShiftAssignment, (assignment) => assignment.shift)
  assignments?: ShiftAssignment[];

  @OneToMany(() => ShiftPosition, (position) => position.shift)
  positions?: ShiftPosition[];
}
