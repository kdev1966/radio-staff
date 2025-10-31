import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RadiologyService } from '../entities/radiology-service.entity';
import { Employee, EmployeeRole } from '../entities/employee.entity';
import { CreateRadiologyServiceDto } from './dto/create-radiology-service.dto';
import { UpdateRadiologyServiceDto } from './dto/update-radiology-service.dto';
import {
  SubscriptionTier,
  ServiceStatus,
} from '../common/enums/permission.enum';

@Injectable()
export class RadiologyServiceService {
  constructor(
    @InjectRepository(RadiologyService)
    private radiologyServiceRepository: Repository<RadiologyService>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
  ) {}

  /**
   * Find all radiology services (SUPER_ADMIN only)
   */
  async findAll() {
    return this.radiologyServiceRepository.find({
      relations: ['employees'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find one radiology service by ID
   */
  async findOne(id: string) {
    const service = await this.radiologyServiceRepository.findOne({
      where: { id },
      relations: ['employees', 'shifts', 'leaveRequests'],
    });

    if (!service) {
      throw new NotFoundException(
        `Service de radiologie avec ID ${id} non trouvé`,
      );
    }

    return service;
  }

  /**
   * Create a new radiology service (SUPER_ADMIN only)
   */
  async create(createRadiologyServiceDto: CreateRadiologyServiceDto) {
    // Check for duplicate service name within the same hospital
    const existing = await this.radiologyServiceRepository.findOne({
      where: {
        name: createRadiologyServiceDto.name,
        hospitalName: createRadiologyServiceDto.hospitalName,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Un service "${createRadiologyServiceDto.name}" existe déjà pour l'hôpital "${createRadiologyServiceDto.hospitalName}"`,
      );
    }

    const service = this.radiologyServiceRepository.create({
      name: createRadiologyServiceDto.name,
      hospitalName: createRadiologyServiceDto.hospitalName,
      address: createRadiologyServiceDto.address,
      subscriptionTier:
        createRadiologyServiceDto.subscriptionTier ?? SubscriptionTier.TRIAL,
      status: createRadiologyServiceDto.status ?? ServiceStatus.TRIAL,
    });

    return this.radiologyServiceRepository.save(service);
  }

  /**
   * Update a radiology service (SUPER_ADMIN only)
   */
  async update(id: string, updateRadiologyServiceDto: UpdateRadiologyServiceDto) {
    const service = await this.findOne(id);

    // If updating name or hospital, check for duplicates
    if (
      updateRadiologyServiceDto.name ||
      updateRadiologyServiceDto.hospitalName
    ) {
      const name = updateRadiologyServiceDto.name ?? service.name;
      const hospitalName =
        updateRadiologyServiceDto.hospitalName ?? service.hospitalName;

      const existing = await this.radiologyServiceRepository.findOne({
        where: { name, hospitalName },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Un service "${name}" existe déjà pour l'hôpital "${hospitalName}"`,
        );
      }
    }

    Object.assign(service, updateRadiologyServiceDto);
    return this.radiologyServiceRepository.save(service);
  }

  /**
   * Suspend a radiology service (SUPER_ADMIN only)
   * Sets status to SUSPENDED and deactivates all employees
   */
  async suspend(id: string) {
    const service = await this.findOne(id);

    if (service.status === ServiceStatus.SUSPENDED) {
      throw new BadRequestException('Ce service est déjà suspendu');
    }

    // Deactivate all employees in the service
    await this.employeeRepository.update(
      { serviceId: id },
      { isActive: false },
    );

    service.status = ServiceStatus.SUSPENDED;
    return this.radiologyServiceRepository.save(service);
  }

  /**
   * Activate a radiology service (SUPER_ADMIN only)
   * Sets status to ACTIVE and reactivates all employees
   */
  async activate(id: string) {
    const service = await this.findOne(id);

    if (service.status === ServiceStatus.ACTIVE) {
      throw new BadRequestException('Ce service est déjà actif');
    }

    // Reactivate all employees in the service
    await this.employeeRepository.update({ serviceId: id }, { isActive: true });

    service.status = ServiceStatus.ACTIVE;
    return this.radiologyServiceRepository.save(service);
  }

  /**
   * Delete a radiology service (SUPER_ADMIN only)
   * Can only delete if no active employees
   */
  async remove(id: string) {
    const service = await this.findOne(id);

    // Check for active employees
    const activeEmployees = await this.employeeRepository.count({
      where: { serviceId: id, isActive: true },
    });

    if (activeEmployees > 0) {
      throw new BadRequestException(
        `Impossible de supprimer ce service car il contient ${activeEmployees} employé(s) actif(s)`,
      );
    }

    await this.radiologyServiceRepository.delete(id);
  }

  /**
   * Get service statistics (SUPER_ADMIN or service ADMIN)
   */
  async getStatistics(id: string) {
    const service = await this.findOne(id);

    const totalEmployees = await this.employeeRepository.count({
      where: { serviceId: id },
    });

    const activeEmployees = await this.employeeRepository.count({
      where: { serviceId: id, isActive: true },
    });

    const adminCount = await this.employeeRepository.count({
      where: { serviceId: id, role: EmployeeRole.ADMIN },
    });

    const rhCount = await this.employeeRepository.count({
      where: { serviceId: id, role: EmployeeRole.RH },
    });

    const employeeCount = await this.employeeRepository.count({
      where: { serviceId: id, role: EmployeeRole.EMPLOYE },
    });

    return {
      service: {
        id: service.id,
        name: service.name,
        hospitalName: service.hospitalName,
        subscriptionTier: service.subscriptionTier,
        status: service.status,
      },
      statistics: {
        totalEmployees,
        activeEmployees,
        inactiveEmployees: totalEmployees - activeEmployees,
        adminCount,
        rhCount,
        employeeCount,
      },
    };
  }
}
