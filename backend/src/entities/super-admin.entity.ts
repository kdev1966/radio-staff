import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('super_admins')
export class SuperAdmin {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ select: false })
  password!: string;

  @Column({ name: 'full_name' })
  fullName!: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ default: true, name: 'is_active' })
  isActive!: boolean;

  @Column({ type: 'timestamp', name: 'last_login_at', nullable: true })
  lastLoginAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
