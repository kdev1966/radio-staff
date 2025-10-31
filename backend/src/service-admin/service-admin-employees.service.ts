import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from '../entities/employee.entity';
import { CreateEmployeeDto } from '../employee/dto/create-employee.dto';
import { UpdateEmployeeDto } from '../employee/dto/update-employee.dto';
import { EmployeeRole } from '../entities/employee.entity';
import * as bcrypt from 'bcrypt';

/**
 * Service Admin Employees Service
 * Handles employee management within a specific service
 */
@Injectable()
export class ServiceAdminEmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
  ) {}

  /**
   * Find all employees in a service
   */
  async findAllByService(serviceId: string) {
    const employees = await this.employeeRepo.find({
      where: { serviceId },
      order: { createdAt: 'DESC' },
      select: [
        'id',
        'email',
        'firstName',
        'lastName',
        'matricule',
        'role',
        'isActive',
        'createdAt',
        'updatedAt',
      ],
    });

    return employees.map((emp) => ({
      ...emp,
      fullName: `${emp.firstName} ${emp.lastName}`,
    }));
  }

  /**
   * Find one employee by ID within a service
   */
  async findOne(serviceId: string, employeeId: string) {
    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId, serviceId },
      select: [
        'id',
        'email',
        'firstName',
        'lastName',
        'matricule',
        'role',
        'isActive',
        'createdAt',
        'updatedAt',
      ],
    });

    if (!employee) {
      throw new NotFoundException(
        `Employee with ID ${employeeId} not found in this service`,
      );
    }

    return {
      ...employee,
      fullName: `${employee.firstName} ${employee.lastName}`,
    };
  }

  /**
   * Create a new employee in the service
   */
  async create(serviceId: string, createDto: CreateEmployeeDto) {
    // Check for duplicate matricule within service
    const existingMatricule = await this.employeeRepo.findOne({
      where: { matricule: createDto.matricule, serviceId },
    });

    if (existingMatricule) {
      throw new ConflictException(
        `An employee with matricule ${createDto.matricule} already exists in this service`,
      );
    }

    // Check for duplicate email within service
    const existingEmail = await this.employeeRepo.findOne({
      where: { email: createDto.email, serviceId },
    });

    if (existingEmail) {
      throw new ConflictException(
        `An employee with email ${createDto.email} already exists in this service`,
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createDto.password, 10);

    const employee = this.employeeRepo.create({
      ...createDto,
      password: hashedPassword,
      serviceId,
    });

    const saved = await this.employeeRepo.save(employee);

    // Return without password
    const { password, ...result } = saved;
    return {
      ...result,
      fullName: `${result.firstName} ${result.lastName}`,
    };
  }

  /**
   * Update an employee
   */
  async update(
    serviceId: string,
    employeeId: string,
    updateDto: UpdateEmployeeDto,
  ) {
    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId, serviceId },
    });

    if (!employee) {
      throw new NotFoundException(
        `Employee with ID ${employeeId} not found in this service`,
      );
    }

    // Check for duplicate matricule if updating
    if (updateDto.matricule && updateDto.matricule !== employee.matricule) {
      const existingMatricule = await this.employeeRepo.findOne({
        where: { matricule: updateDto.matricule, serviceId },
      });

      if (existingMatricule && existingMatricule.id !== employeeId) {
        throw new ConflictException(
          `An employee with matricule ${updateDto.matricule} already exists in this service`,
        );
      }
    }

    // Check for duplicate email if updating
    if (updateDto.email && updateDto.email !== employee.email) {
      const existingEmail = await this.employeeRepo.findOne({
        where: { email: updateDto.email, serviceId },
      });

      if (existingEmail && existingEmail.id !== employeeId) {
        throw new ConflictException(
          `An employee with email ${updateDto.email} already exists in this service`,
        );
      }
    }

    const updateData: any = { ...updateDto };

    // Hash password if provided
    if (updateDto.password) {
      updateData.password = await bcrypt.hash(updateDto.password, 10);
    }

    await this.employeeRepo.update(employeeId, updateData);

    return this.findOne(serviceId, employeeId);
  }

  /**
   * Archive an employee (soft delete = set inactive)
   */
  async archive(serviceId: string, employeeId: string) {
    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId, serviceId },
    });

    if (!employee) {
      throw new NotFoundException(
        `Employee with ID ${employeeId} not found in this service`,
      );
    }

    await this.employeeRepo.update(employeeId, { isActive: false });
    return this.findOne(serviceId, employeeId);
  }

  /**
   * Restore an archived employee (set active)
   */
  async restore(serviceId: string, employeeId: string) {
    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId, serviceId },
    });

    if (!employee) {
      throw new NotFoundException(
        `Employee with ID ${employeeId} not found in this service`,
      );
    }

    await this.employeeRepo.update(employeeId, { isActive: true });
    return this.findOne(serviceId, employeeId);
  }

  /**
   * Update employee permissions
   */
  async updatePermissions(
    serviceId: string,
    employeeId: string,
    role: EmployeeRole,
  ) {
    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId, serviceId },
    });

    if (!employee) {
      throw new NotFoundException(
        `Employee with ID ${employeeId} not found in this service`,
      );
    }

    await this.employeeRepo.update(employeeId, { role });
    return this.findOne(serviceId, employeeId);
  }

  /**
   * Delete an employee permanently
   */
  async remove(serviceId: string, employeeId: string) {
    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId, serviceId },
    });

    if (!employee) {
      throw new NotFoundException(
        `Employee with ID ${employeeId} not found in this service`,
      );
    }

    await this.employeeRepo.delete(employeeId);
  }

  /**
   * Get employee statistics for the service
   */
  async getServiceStats(serviceId: string) {
    const [total, active, archived, byRole] = await Promise.all([
      this.employeeRepo.count({ where: { serviceId } }),
      this.employeeRepo.count({ where: { serviceId, isActive: true } }),
      this.employeeRepo.count({ where: { serviceId, isActive: false } }),
      this.getEmployeesByRole(serviceId),
    ]);

    return {
      total,
      active,
      archived,
      byRole,
    };
  }

  /**
   * Get employees grouped by role
   */
  private async getEmployeesByRole(serviceId: string) {
    const employees = await this.employeeRepo.find({
      where: { serviceId },
      select: ['role'],
    });

    const roleCounts: Record<string, number> = {};
    employees.forEach((emp) => {
      roleCounts[emp.role] = (roleCounts[emp.role] || 0) + 1;
    });

    return Object.entries(roleCounts).map(([role, count]) => ({
      role,
      count,
    }));
  }
}
