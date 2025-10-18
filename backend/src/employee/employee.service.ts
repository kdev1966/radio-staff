import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeeService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.employee.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      throw new NotFoundException(`Employé avec ID ${id} non trouvé`);
    }

    return employee;
  }

  async create(createEmployeeDto: CreateEmployeeDto) {
    // Vérifier si le matricule existe déjà
    const existing = await this.prisma.employee.findUnique({
      where: { matricule: createEmployeeDto.matricule },
    });

    if (existing) {
      throw new ConflictException(`Un employé avec le matricule ${createEmployeeDto.matricule} existe déjà`);
    }

    return this.prisma.employee.create({
      data: {
        matricule: createEmployeeDto.matricule,
        firstName: createEmployeeDto.firstName,
        lastName: createEmployeeDto.lastName,
        birthDate: new Date(createEmployeeDto.birthDate),
        phone: createEmployeeDto.phone,
        role: createEmployeeDto.role,
        address: createEmployeeDto.address,
      },
    });
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto) {
    await this.findOne(id); // Vérifie si existe

    // Si le matricule est modifié, vérifier qu'il n'existe pas déjà
    if (updateEmployeeDto.matricule) {
      const existing = await this.prisma.employee.findFirst({
        where: {
          matricule: updateEmployeeDto.matricule,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException(`Un employé avec le matricule ${updateEmployeeDto.matricule} existe déjà`);
      }
    }

    return this.prisma.employee.update({
      where: { id },
      data: {
        ...(updateEmployeeDto.matricule && { matricule: updateEmployeeDto.matricule }),
        ...(updateEmployeeDto.firstName && { firstName: updateEmployeeDto.firstName }),
        ...(updateEmployeeDto.lastName && { lastName: updateEmployeeDto.lastName }),
        ...(updateEmployeeDto.birthDate && { birthDate: new Date(updateEmployeeDto.birthDate) }),
        ...(updateEmployeeDto.phone && { phone: updateEmployeeDto.phone }),
        ...(updateEmployeeDto.role && { role: updateEmployeeDto.role }),
        ...(updateEmployeeDto.address && { address: updateEmployeeDto.address }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Vérifie si existe
    await this.prisma.employee.delete({ where: { id } });
  }
}
