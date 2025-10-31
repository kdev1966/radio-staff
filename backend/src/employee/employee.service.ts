import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Employee, EmployeeRole } from '../entities/employee.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { Permission } from '../common/enums/permission.enum';
import * as bcrypt from 'bcrypt';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
  ) {}

  /**
   * Find all employees within a specific service
   */
  async findAll(serviceId: string) {
    return this.employeeRepository.find({
      where: { serviceId },
      relations: ['service'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find one employee by ID within a specific service
   */
  async findOne(id: string, serviceId: string) {
    const employee = await this.employeeRepository.findOne({
      where: { id, serviceId },
      relations: ['service'],
    });

    if (!employee) {
      throw new NotFoundException(
        `Employé avec ID ${id} non trouvé dans votre service`,
      );
    }

    return employee;
  }

  /**
   * Create a new employee within a service
   * Validates ADMIN constraint (1 per service) and matricule uniqueness
   */
  async create(createEmployeeDto: CreateEmployeeDto, serviceId: string) {
    // If creating ADMIN role, verify only 1 ADMIN per service
    if (createEmployeeDto.role === EmployeeRole.ADMIN) {
      const existingAdmin = await this.employeeRepository.findOne({
        where: { serviceId, role: EmployeeRole.ADMIN },
      });

      if (existingAdmin) {
        throw new ConflictException(
          `Ce service a déjà un ADMIN (Chef de service). Un seul ADMIN par service est autorisé.`,
        );
      }
    }

    // Verify matricule uniqueness within the service
    const existingMatricule = await this.employeeRepository.findOne({
      where: { serviceId, matricule: createEmployeeDto.matricule },
    });

    if (existingMatricule) {
      throw new ConflictException(
        `Un employé avec le matricule ${createEmployeeDto.matricule} existe déjà dans ce service`,
      );
    }

    // Verify email uniqueness globally
    const existingEmail = await this.employeeRepository.findOne({
      where: { email: createEmployeeDto.email },
    });

    if (existingEmail) {
      throw new ConflictException(
        `Un employé avec l'email ${createEmployeeDto.email} existe déjà`,
      );
    }

    // Validate role and employeeType logic
    if (createEmployeeDto.role === EmployeeRole.EMPLOYE) {
      if (!createEmployeeDto.employeeType) {
        throw new BadRequestException(
          `Le champ employeeType est requis pour le rôle EMPLOYE (TECHNICIEN ou ADMINISTRATIF)`,
        );
      }
    } else if (createEmployeeDto.employeeType) {
      throw new BadRequestException(
        `Le champ employeeType ne doit être défini que pour le rôle EMPLOYE`,
      );
    }

    // Validate permissions logic
    if (createEmployeeDto.role === EmployeeRole.RH) {
      if (
        !createEmployeeDto.permissions ||
        createEmployeeDto.permissions.length === 0
      ) {
        throw new BadRequestException(
          `Le rôle RH nécessite au moins une permission définie`,
        );
      }
    } else if (
      createEmployeeDto.permissions &&
      createEmployeeDto.permissions.length > 0
    ) {
      throw new BadRequestException(
        `Les permissions ne peuvent être définies que pour le rôle RH`,
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createEmployeeDto.password, 10);

    const employee = this.employeeRepository.create({
      serviceId,
      matricule: createEmployeeDto.matricule,
      firstName: createEmployeeDto.firstName,
      lastName: createEmployeeDto.lastName,
      birthDate: new Date(createEmployeeDto.birthDate),
      phone: createEmployeeDto.phone,
      email: createEmployeeDto.email,
      password: hashedPassword,
      role: createEmployeeDto.role,
      employeeType: createEmployeeDto.employeeType,
      permissions: createEmployeeDto.permissions,
      address: createEmployeeDto.address,
      isActive: true,
    });

    return this.employeeRepository.save(employee);
  }

  /**
   * Update an employee within a service
   */
  async update(
    id: string,
    updateEmployeeDto: UpdateEmployeeDto,
    serviceId: string,
  ) {
    const employee = await this.findOne(id, serviceId);

    // If changing to ADMIN role, verify constraint
    if (
      updateEmployeeDto.role === EmployeeRole.ADMIN &&
      employee.role !== EmployeeRole.ADMIN
    ) {
      const existingAdmin = await this.employeeRepository.findOne({
        where: { serviceId, role: EmployeeRole.ADMIN },
      });

      if (existingAdmin) {
        throw new ConflictException(
          `Ce service a déjà un ADMIN. Un seul ADMIN par service est autorisé.`,
        );
      }
    }

    // Verify matricule uniqueness within service if changed
    if (updateEmployeeDto.matricule) {
      const existingMatricule = await this.employeeRepository.findOne({
        where: {
          serviceId,
          matricule: updateEmployeeDto.matricule,
          id: Not(id),
        },
      });

      if (existingMatricule) {
        throw new ConflictException(
          `Un employé avec le matricule ${updateEmployeeDto.matricule} existe déjà dans ce service`,
        );
      }
    }

    // Verify email uniqueness globally if changed
    if (updateEmployeeDto.email) {
      const existingEmail = await this.employeeRepository.findOne({
        where: {
          email: updateEmployeeDto.email,
          id: Not(id),
        },
      });

      if (existingEmail) {
        throw new ConflictException(
          `Un employé avec l'email ${updateEmployeeDto.email} existe déjà`,
        );
      }
    }

    const updateData: any = {};
    if (updateEmployeeDto.matricule)
      updateData.matricule = updateEmployeeDto.matricule;
    if (updateEmployeeDto.firstName)
      updateData.firstName = updateEmployeeDto.firstName;
    if (updateEmployeeDto.lastName)
      updateData.lastName = updateEmployeeDto.lastName;
    if (updateEmployeeDto.birthDate)
      updateData.birthDate = new Date(updateEmployeeDto.birthDate);
    if (updateEmployeeDto.phone) updateData.phone = updateEmployeeDto.phone;
    if (updateEmployeeDto.role) updateData.role = updateEmployeeDto.role;
    if (updateEmployeeDto.employeeType)
      updateData.employeeType = updateEmployeeDto.employeeType;
    if (updateEmployeeDto.permissions !== undefined)
      updateData.permissions = updateEmployeeDto.permissions;
    if (updateEmployeeDto.address) updateData.address = updateEmployeeDto.address;
    if (updateEmployeeDto.password) {
      updateData.password = await bcrypt.hash(updateEmployeeDto.password, 10);
    }

    await this.employeeRepository.update(id, updateData);
    return this.findOne(id, serviceId);
  }

  /**
   * Archive an employee (soft delete)
   */
  async archive(id: string, serviceId: string) {
    const employee = await this.findOne(id, serviceId);

    // Prevent archiving ADMIN if they have active employees
    if (employee.role === EmployeeRole.ADMIN) {
      const activeEmployees = await this.employeeRepository.count({
        where: { serviceId, isActive: true },
      });

      if (activeEmployees > 1) {
        throw new ForbiddenException(
          `Impossible d'archiver l'ADMIN tant qu'il y a des employés actifs dans le service`,
        );
      }
    }

    await this.employeeRepository.update(id, { isActive: false });
    return this.findOne(id, serviceId);
  }

  /**
   * Transfer an employee to another service (SUPER_ADMIN only)
   */
  async transfer(
    id: string,
    targetServiceId: string,
    currentServiceId: string,
  ) {
    const employee = await this.findOne(id, currentServiceId);

    // Cannot transfer ADMIN role
    if (employee.role === EmployeeRole.ADMIN) {
      throw new ForbiddenException(
        `Impossible de transférer un ADMIN. Veuillez d'abord changer son rôle.`,
      );
    }

    // Verify matricule uniqueness in target service
    const existingMatricule = await this.employeeRepository.findOne({
      where: {
        serviceId: targetServiceId,
        matricule: employee.matricule,
      },
    });

    if (existingMatricule) {
      throw new ConflictException(
        `Un employé avec le matricule ${employee.matricule} existe déjà dans le service cible`,
      );
    }

    await this.employeeRepository.update(id, {
      previousServiceId: currentServiceId,
      serviceId: targetServiceId,
      transferredAt: new Date(),
      permissions: [], // Reset permissions on transfer
    });

    return this.employeeRepository.findOne({
      where: { id },
      relations: ['service'],
    });
  }

  /**
   * Assign permissions to an RH employee (ADMIN only)
   */
  async assignPermissions(
    id: string,
    permissions: Permission[],
    serviceId: string,
  ) {
    const employee = await this.findOne(id, serviceId);

    if (employee.role !== EmployeeRole.RH) {
      throw new BadRequestException(
        `Les permissions ne peuvent être assignées qu'aux employés avec le rôle RH`,
      );
    }

    if (!permissions || permissions.length === 0) {
      throw new BadRequestException(
        `Au moins une permission doit être assignée au rôle RH`,
      );
    }

    await this.employeeRepository.update(id, { permissions });
    return this.findOne(id, serviceId);
  }

  /**
   * Permanently delete an employee
   */
  async remove(id: string, serviceId: string) {
    const employee = await this.findOne(id, serviceId);

    // Prevent deletion of ADMIN if they have active employees
    if (employee.role === EmployeeRole.ADMIN) {
      const activeEmployees = await this.employeeRepository.count({
        where: { serviceId, isActive: true },
      });

      if (activeEmployees > 1) {
        throw new ForbiddenException(
          `Impossible de supprimer l'ADMIN tant qu'il y a des employés actifs dans le service`,
        );
      }
    }

    await this.employeeRepository.delete(id);
  }
}
