import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Employee } from '../entities/employee.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<Employee | null> {
    const employee = await this.employeeRepository.findOne({
      where: { email },
      select: ['id', 'email', 'password', 'firstName', 'lastName', 'role', 'matricule'],
    });

    if (!employee) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, employee.password);
    if (!isPasswordValid) {
      return null;
    }

    // Remove password from returned object
    const { password: _, ...result } = employee;
    return result as Employee;
  }

  async login(loginDto: LoginDto) {
    const employee = await this.validateUser(loginDto.email, loginDto.password);

    if (!employee) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const payload = {
      sub: employee.id,
      email: employee.email,
      role: employee.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: employee.id,
        email: employee.email,
        firstName: employee.firstName,
        lastName: employee.lastName,
        role: employee.role,
        matricule: employee.matricule,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    // Check if email already exists
    const existingEmployee = await this.employeeRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingEmployee) {
      throw new ConflictException('Cet email est déjà utilisé');
    }

    // Check if matricule already exists
    const existingMatricule = await this.employeeRepository.findOne({
      where: { matricule: registerDto.matricule },
    });

    if (existingMatricule) {
      throw new ConflictException('Ce matricule est déjà utilisé');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Create new employee
    const employee = this.employeeRepository.create({
      ...registerDto,
      password: hashedPassword,
    });

    await this.employeeRepository.save(employee);

    // Return user without password
    const { password: _, ...result } = employee;
    return result;
  }

  async getProfile(userId: string) {
    const employee = await this.employeeRepository.findOne({
      where: { id: userId },
    });

    if (!employee) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    return employee;
  }
}
