import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { SuperAdminServicesService } from './super-admin-services.service';
import { CreateRadiologyServiceDto } from './dto/create-radiology-service.dto';
import { UpdateRadiologyServiceDto } from './dto/update-radiology-service.dto';

/**
 * SuperAdmin Services Management Controller
 * Provides full CRUD and lifecycle management for radiology services
 * All routes are restricted to SUPER_ADMIN only
 */
@Controller('super-admin/services')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class SuperAdminServicesController {
  constructor(
    private readonly servicesService: SuperAdminServicesService,
  ) {}

  /**
   * Get all radiology services with detailed information
   * Includes: employees, status, tier, subscription info
   */
  @Get()
  async findAll() {
    return this.servicesService.findAll();
  }

  /**
   * Get a specific service by ID with full details
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.servicesService.findOne(id);
  }

  /**
   * Create a new radiology service
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateRadiologyServiceDto) {
    return this.servicesService.create(createDto);
  }

  /**
   * Update a radiology service
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateRadiologyServiceDto,
  ) {
    return this.servicesService.update(id, updateDto);
  }

  /**
   * Suspend a service (temporarily disable access)
   * Status: ACTIVE → SUSPENDED
   */
  @Patch(':id/suspend')
  @HttpCode(HttpStatus.OK)
  async suspend(@Param('id') id: string) {
    return this.servicesService.suspend(id);
  }

  /**
   * Activate a service (restore access)
   * Status: SUSPENDED/TRIAL/EXPIRED → ACTIVE
   */
  @Patch(':id/activate')
  @HttpCode(HttpStatus.OK)
  async activate(@Param('id') id: string) {
    return this.servicesService.activate(id);
  }

  /**
   * Mark service as expired (subscription ended)
   * Status: * → EXPIRED
   */
  @Patch(':id/expire')
  @HttpCode(HttpStatus.OK)
  async expire(@Param('id') id: string) {
    return this.servicesService.expire(id);
  }

  /**
   * Upgrade/downgrade service tier
   */
  @Patch(':id/tier')
  @HttpCode(HttpStatus.OK)
  async updateTier(
    @Param('id') id: string,
    @Body() body: { tier: string },
  ) {
    return this.servicesService.updateTier(id, body.tier);
  }

  /**
   * Delete a service (hard delete - use with caution)
   * This will cascade delete all employees, shifts, and leave requests
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return this.servicesService.remove(id);
  }

  /**
   * Get service statistics (employees, shifts, leaves)
   */
  @Get(':id/stats')
  async getStats(@Param('id') id: string) {
    return this.servicesService.getServiceStats(id);
  }
}
