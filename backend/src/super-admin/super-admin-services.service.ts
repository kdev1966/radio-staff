import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RadiologyService } from '../entities/radiology-service.entity';
import { Employee } from '../entities/employee.entity';
import { Shift } from '../entities/shift.entity';
import { LeaveRequest } from '../entities/leave-request.entity';
import { ServiceStatus, SubscriptionTier } from '../common/enums/permission.enum';
import { LeaveStatus } from '../common/enums/leave.enum';
import { CreateRadiologyServiceDto } from './dto/create-radiology-service.dto';
import { UpdateRadiologyServiceDto } from './dto/update-radiology-service.dto';

/**
 * SuperAdmin Services Management Service
 * Handles full lifecycle management of radiology services
 */
@Injectable()
export class SuperAdminServicesService {
  constructor(
    @InjectRepository(RadiologyService)
    private readonly serviceRepo: Repository<RadiologyService>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(Shift)
    private readonly shiftRepo: Repository<Shift>,
    @InjectRepository(LeaveRequest)
    private readonly leaveRepo: Repository<LeaveRequest>,
  ) {}

  /**
   * Get all radiology services with employee counts
   */
  async findAll() {
    const services = await this.serviceRepo.find({
      relations: ['employees'],
      order: { createdAt: 'DESC' },
    });

    return services.map((service) => ({
      id: service.id,
      name: service.name,
      hospitalName: service.hospitalName,
      address: service.address,
      status: service.status,
      subscriptionTier: service.subscriptionTier,
      subscriptionEndsAt: service.subscriptionEndsAt,
      trialEndsAt: service.trialEndsAt,
      employeeCount: service.employees?.length || 0,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    }));
  }

  /**
   * Get a specific service with full details
   */
  async findOne(id: string) {
    const service = await this.serviceRepo.findOne({
      where: { id },
      relations: ['employees', 'shifts', 'leaveRequests'],
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    return {
      ...service,
      employeeCount: service.employees?.length || 0,
      shiftCount: service.shifts?.length || 0,
      leaveRequestCount: service.leaveRequests?.length || 0,
    };
  }

  /**
   * Create a new radiology service
   */
  async create(createDto: CreateRadiologyServiceDto) {
    const service = this.serviceRepo.create({
      name: createDto.name,
      hospitalName: createDto.hospitalName,
      address: createDto.address,
      subscriptionTier: createDto.subscriptionTier || SubscriptionTier.TRIAL,
      status: ServiceStatus.TRIAL,
      trialEndsAt: createDto.trialEndsAt || this.getTrialEndDate(),
    });

    return this.serviceRepo.save(service);
  }

  /**
   * Update a radiology service
   */
  async update(id: string, updateDto: UpdateRadiologyServiceDto) {
    const service = await this.serviceRepo.findOne({ where: { id } });

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    Object.assign(service, updateDto);
    return this.serviceRepo.save(service);
  }

  /**
   * Suspend a service (block access)
   */
  async suspend(id: string) {
    const service = await this.serviceRepo.findOne({ where: { id } });

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    if (service.status === ServiceStatus.SUSPENDED) {
      throw new BadRequestException('Service is already suspended');
    }

    service.status = ServiceStatus.SUSPENDED;
    return this.serviceRepo.save(service);
  }

  /**
   * Activate a service (restore access)
   */
  async activate(id: string) {
    const service = await this.serviceRepo.findOne({ where: { id } });

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    if (service.status === ServiceStatus.ACTIVE) {
      throw new BadRequestException('Service is already active');
    }

    service.status = ServiceStatus.ACTIVE;
    return this.serviceRepo.save(service);
  }

  /**
   * Mark service as expired
   */
  async expire(id: string) {
    const service = await this.serviceRepo.findOne({ where: { id } });

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    service.status = ServiceStatus.EXPIRED;
    return this.serviceRepo.save(service);
  }

  /**
   * Update service tier
   */
  async updateTier(id: string, tier: string) {
    const service = await this.serviceRepo.findOne({ where: { id } });

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    // Validate tier
    if (!Object.values(SubscriptionTier).includes(tier as SubscriptionTier)) {
      throw new BadRequestException(`Invalid tier: ${tier}`);
    }

    service.subscriptionTier = tier as SubscriptionTier;
    return this.serviceRepo.save(service);
  }

  /**
   * Delete a service (hard delete with cascade)
   */
  async remove(id: string) {
    const service = await this.serviceRepo.findOne({ where: { id } });

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    await this.serviceRepo.remove(service);
    return { message: 'Service deleted successfully' };
  }

  /**
   * Get service statistics
   */
  async getServiceStats(id: string) {
    const service = await this.serviceRepo.findOne({
      where: { id },
      relations: ['employees', 'shifts', 'leaveRequests'],
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    const pendingLeaves = service.leaveRequests?.filter(
      (lr) => lr.status === LeaveStatus.PENDING || lr.status === LeaveStatus.APPROVED_BY_RH,
    ).length || 0;

    return {
      totalEmployees: service.employees?.length || 0,
      totalShifts: service.shifts?.length || 0,
      totalLeaveRequests: service.leaveRequests?.length || 0,
      pendingLeaves,
      status: service.status,
      tier: service.subscriptionTier,
    };
  }

  /**
   * Helper: Calculate trial end date (30 days from now)
   */
  private getTrialEndDate(): Date {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date;
  }
}
