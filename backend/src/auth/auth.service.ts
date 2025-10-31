import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Employee } from '../entities/employee.entity';
import { SuperAdmin } from '../entities/super-admin.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    @InjectRepository(SuperAdmin)
    private superAdminRepository: Repository<SuperAdmin>,
    private jwtService: JwtService,
  ) {}

  /**
   * Validate Employee credentials
   */
  async validateEmployee(
    email: string,
    password: string,
  ): Promise<Employee | null> {
    const employee = await this.employeeRepository.findOne({
      where: { email, isActive: true },
      select: [
        'id',
        'email',
        'password',
        'firstName',
        'lastName',
        'role',
        'matricule',
        'serviceId',
        'permissions',
        'employeeType',
      ],
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

  /**
   * Validate SuperAdmin credentials
   */
  async validateSuperAdmin(
    email: string,
    password: string,
  ): Promise<SuperAdmin | null> {
    const superAdmin = await this.superAdminRepository.findOne({
      where: { email, isActive: true },
      select: ['id', 'email', 'password', 'fullName'],
    });

    if (!superAdmin) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, superAdmin.password);
    if (!isPasswordValid) {
      return null;
    }

    // Update last login
    await this.superAdminRepository.update(superAdmin.id, {
      lastLoginAt: new Date(),
    });

    // Remove password from returned object
    const { password: _, ...result } = superAdmin;
    return result as SuperAdmin;
  }

  /**
   * Employee login
   */
  async loginEmployee(loginDto: LoginDto) {
    const employee = await this.validateEmployee(
      loginDto.email,
      loginDto.password,
    );

    if (!employee) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const payload = {
      sub: employee.id,
      email: employee.email,
      role: employee.role,
      serviceId: employee.serviceId,
      permissions: employee.permissions || [],
      isSuperAdmin: false,
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
        serviceId: employee.serviceId,
        permissions: employee.permissions,
        employeeType: employee.employeeType,
      },
    };
  }

  /**
   * SuperAdmin login
   */
  async loginSuperAdmin(loginDto: LoginDto) {
    const superAdmin = await this.validateSuperAdmin(
      loginDto.email,
      loginDto.password,
    );

    if (!superAdmin) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const payload = {
      sub: superAdmin.id,
      email: superAdmin.email,
      isSuperAdmin: true,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: superAdmin.id,
        email: superAdmin.email,
        fullName: superAdmin.fullName,
        isSuperAdmin: true,
      },
    };
  }

  /**
   * @deprecated Use loginEmployee instead
   */
  async login(loginDto: LoginDto) {
    return this.loginEmployee(loginDto);
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

  async getProfile(userId: string, isSuperAdmin: boolean = false) {
    if (isSuperAdmin) {
      const superAdmin = await this.superAdminRepository.findOne({
        where: { id: userId },
        select: ['id', 'email', 'fullName', 'isActive', 'lastLoginAt'],
      });

      if (!superAdmin) {
        throw new UnauthorizedException('SuperAdmin non trouvé');
      }

      return { ...superAdmin, isSuperAdmin: true };
    }

    const employee = await this.employeeRepository.findOne({
      where: { id: userId },
      relations: ['service'],
    });

    if (!employee) {
      throw new UnauthorizedException('Employé non trouvé');
    }

    return { ...employee, isSuperAdmin: false };
  }
}
