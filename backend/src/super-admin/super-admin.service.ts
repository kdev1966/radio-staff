import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SuperAdmin } from '../entities/super-admin.entity';
import { CreateSuperAdminDto } from './dto/create-super-admin.dto';
import { UpdateSuperAdminDto } from './dto/update-super-admin.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SuperAdminService {
  constructor(
    @InjectRepository(SuperAdmin)
    private superAdminRepository: Repository<SuperAdmin>,
  ) {}

  /**
   * Find all super admins
   */
  async findAll() {
    return this.superAdminRepository.find({
      select: ['id', 'email', 'fullName', 'isActive', 'lastLoginAt', 'createdAt'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find one super admin by ID
   */
  async findOne(id: string) {
    const superAdmin = await this.superAdminRepository.findOne({
      where: { id },
      select: ['id', 'email', 'fullName', 'isActive', 'lastLoginAt', 'createdAt'],
    });

    if (!superAdmin) {
      throw new NotFoundException(`Super Admin avec ID ${id} non trouvé`);
    }

    return superAdmin;
  }

  /**
   * Find super admin by email (for authentication)
   */
  async findByEmail(email: string) {
    return this.superAdminRepository.findOne({
      where: { email },
      select: ['id', 'email', 'password', 'fullName', 'isActive'],
    });
  }

  /**
   * Create a new super admin
   */
  async create(createSuperAdminDto: CreateSuperAdminDto) {
    // Check for duplicate email
    const existing = await this.superAdminRepository.findOne({
      where: { email: createSuperAdminDto.email },
    });

    if (existing) {
      throw new ConflictException(
        `Un Super Admin avec l'email ${createSuperAdminDto.email} existe déjà`,
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createSuperAdminDto.password, 10);

    const superAdmin = this.superAdminRepository.create({
      email: createSuperAdminDto.email,
      password: hashedPassword,
      fullName: createSuperAdminDto.fullName,
      isActive: createSuperAdminDto.isActive ?? true,
    });

    const saved = await this.superAdminRepository.save(superAdmin);

    // Return without password
    const { password, ...result } = saved;
    return result;
  }

  /**
   * Update a super admin
   */
  async update(id: string, updateSuperAdminDto: UpdateSuperAdminDto) {
    const superAdmin = await this.findOne(id);

    // If updating email, check for duplicates
    if (updateSuperAdminDto.email) {
      const existing = await this.superAdminRepository.findOne({
        where: { email: updateSuperAdminDto.email },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Un Super Admin avec l'email ${updateSuperAdminDto.email} existe déjà`,
        );
      }
    }

    const updateData: any = {};
    if (updateSuperAdminDto.email) updateData.email = updateSuperAdminDto.email;
    if (updateSuperAdminDto.fullName)
      updateData.fullName = updateSuperAdminDto.fullName;
    if (updateSuperAdminDto.isActive !== undefined)
      updateData.isActive = updateSuperAdminDto.isActive;
    if (updateSuperAdminDto.password) {
      updateData.password = await bcrypt.hash(updateSuperAdminDto.password, 10);
    }

    await this.superAdminRepository.update(id, updateData);
    return this.findOne(id);
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(id: string) {
    await this.superAdminRepository.update(id, {
      lastLoginAt: new Date(),
    });
  }

  /**
   * Deactivate a super admin (soft delete)
   */
  async deactivate(id: string) {
    await this.findOne(id);
    await this.superAdminRepository.update(id, { isActive: false });
    return this.findOne(id);
  }

  /**
   * Activate a super admin
   */
  async activate(id: string) {
    await this.findOne(id);
    await this.superAdminRepository.update(id, { isActive: true });
    return this.findOne(id);
  }

  /**
   * Permanently delete a super admin
   */
  async remove(id: string) {
    await this.findOne(id);
    await this.superAdminRepository.delete(id);
  }
}
