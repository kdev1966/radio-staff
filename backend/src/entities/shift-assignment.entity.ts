import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Shift } from './shift.entity';
import { Employee } from './employee.entity';
import { ShiftPosition } from './shift-position.entity';

@Entity('shift_assignments')
@Unique(['shiftId', 'employeeId'])
export class ShiftAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'shift_id' })
  shiftId!: string;

  @Column({ name: 'employee_id' })
  employeeId!: string;

  @Column({ nullable: true, name: 'position_id' })
  positionId?: string;

  @CreateDateColumn({ name: 'assigned_at' })
  assignedAt!: Date;

  @Column({ nullable: true, name: 'assigned_by' })
  assignedBy?: string;

  @ManyToOne(() => Shift, (shift) => shift.assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shift_id' })
  shift!: Shift;

  @ManyToOne(() => Employee, (employee) => employee.assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee!: Employee;

  @ManyToOne(() => ShiftPosition, (position) => position.assignments, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'position_id' })
  position?: ShiftPosition;
}
