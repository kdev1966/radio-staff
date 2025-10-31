import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Employee } from '../../entities/employee.entity';
import { SuperAdmin } from '../../entities/super-admin.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  role?: string; // For employees
  isSuperAdmin?: boolean; // Flag to identify SuperAdmin
  serviceId?: string; // For employees
  permissions?: string[]; // For RH employees
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    @InjectRepository(SuperAdmin)
    private superAdminRepository: Repository<SuperAdmin>,
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'JWT_SECRET',
        'dev-secret-change-in-production',
      ),
    });
  }

  async validate(payload: JwtPayload) {
    // Check if this is a SuperAdmin token
    if (payload.isSuperAdmin) {
      const superAdmin = await this.superAdminRepository.findOne({
        where: { id: payload.sub, isActive: true },
        select: ['id', 'email', 'fullName', 'isActive'],
      });

      if (!superAdmin) {
        throw new UnauthorizedException('SuperAdmin non trouvé ou inactif');
      }

      // Return SuperAdmin with isSuperAdmin flag
      return {
        ...superAdmin,
        isSuperAdmin: true,
      };
    }

    // Otherwise, it's an Employee token
    const employee = await this.employeeRepository.findOne({
      where: { id: payload.sub, isActive: true },
      relations: ['service'],
    });

    if (!employee) {
      throw new UnauthorizedException('Employé non trouvé ou inactif');
    }

    // Return Employee with additional context
    return {
      ...employee,
      isSuperAdmin: false,
    };
  }
}
