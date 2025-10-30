import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Employee } from '../entities/employee.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
  ) {}

  async findAll() {
    return this.employeeRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const employee = await this.employeeRepository.findOne({
      where: { id },
    });

    if (!employee) {
      throw new NotFoundException(`Employé avec ID ${id} non trouvé`);
    }

    return employee;
  }

  async create(createEmployeeDto: CreateEmployeeDto) {
    // Vérifier si le matricule existe déjà
    const existing = await this.employeeRepository.findOne({
      where: { matricule: createEmployeeDto.matricule },
    });

    if (existing) {
      throw new ConflictException(`Un employé avec le matricule ${createEmployeeDto.matricule} existe déjà`);
    }

    const employee = this.employeeRepository.create({
      matricule: createEmployeeDto.matricule,
      firstName: createEmployeeDto.firstName,
      lastName: createEmployeeDto.lastName,
      birthDate: new Date(createEmployeeDto.birthDate),
      phone: createEmployeeDto.phone,
      role: createEmployeeDto.role,
      address: createEmployeeDto.address,
    });

    return this.employeeRepository.save(employee);
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto) {
    await this.findOne(id); // Vérifie si existe

    // Si le matricule est modifié, vérifier qu'il n'existe pas déjà
    if (updateEmployeeDto.matricule) {
      const existing = await this.employeeRepository.findOne({
        where: {
          matricule: updateEmployeeDto.matricule,
          id: Not(id),
        },
      });

      if (existing) {
        throw new ConflictException(`Un employé avec le matricule ${updateEmployeeDto.matricule} existe déjà`);
      }
    }

    const updateData: any = {};
    if (updateEmployeeDto.matricule) updateData.matricule = updateEmployeeDto.matricule;
    if (updateEmployeeDto.firstName) updateData.firstName = updateEmployeeDto.firstName;
    if (updateEmployeeDto.lastName) updateData.lastName = updateEmployeeDto.lastName;
    if (updateEmployeeDto.birthDate) updateData.birthDate = new Date(updateEmployeeDto.birthDate);
    if (updateEmployeeDto.phone) updateData.phone = updateEmployeeDto.phone;
    if (updateEmployeeDto.role) updateData.role = updateEmployeeDto.role;
    if (updateEmployeeDto.address) updateData.address = updateEmployeeDto.address;

    await this.employeeRepository.update(id, updateData);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id); // Vérifie si existe
    await this.employeeRepository.delete(id);
  }
}
