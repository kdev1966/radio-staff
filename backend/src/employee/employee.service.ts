import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
// import { Employee } from '@prisma/client'; // Sera disponible après prisma generate

@Injectable()
export class EmployeeService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<any[]> {
    return this.prisma.employee.findMany({ include: { roles: { include: { role: true } } } });
  }

  async findOne(id: string): Promise<any> {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return employee;
  }

  async create(data: any): Promise<any> {
    return this.prisma.employee.create({ data, include: { roles: { include: { role: true } } } });
  }

  async update(id: string, data: any): Promise<any> {
    await this.findOne(id); // Check if exists
    return this.prisma.employee.update({
      where: { id },
      data,
      include: { roles: { include: { role: true } } },
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id); // Check if exists
    await this.prisma.employee.delete({ where: { id } });
  }
}