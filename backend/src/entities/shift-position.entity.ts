import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, Unique } from 'typeorm';
import { Shift } from './shift.entity';
import { ShiftAssignment } from './shift-assignment.entity';

export enum PositionName {
  RX = 'RX',
  SCANNER = 'SCANNER',
  MOBILE = 'MOBILE',
  RECEPTION = 'RECEPTION',
  GENERAL = 'GENERAL', // Pour après-midi/soir/dimanche (flexible)
}

export enum RequiredRole {
  TECHNICIEN = 'TECHNICIEN',
  ADMINISTRATIF = 'ADMINISTRATIF',
}

@Entity('shift_positions')
@Unique(['shiftId', 'positionName'])
export class ShiftPosition {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'shift_id' })
  shiftId!: string;

  @Column({
    type: 'enum',
    enum: PositionName,
    name: 'position_name',
  })
  positionName!: PositionName;

  @Column()
  needed!: number;

  @Column({
    type: 'enum',
    enum: RequiredRole,
    name: 'required_role',
  })
  requiredRole!: RequiredRole;

  @ManyToOne(() => Shift, (shift) => shift.positions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shift_id' })
  shift!: Shift;

  @OneToMany(() => ShiftAssignment, (assignment) => assignment.position)
  assignments?: ShiftAssignment[];
}
