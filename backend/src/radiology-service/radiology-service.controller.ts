import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RadiologyServiceService } from './radiology-service.service';
import { CreateRadiologyServiceDto } from './dto/create-radiology-service.dto';
import { UpdateRadiologyServiceDto } from './dto/update-radiology-service.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';

/**
 * RadiologyService Controller - Manages radiology services (multi-tenant)
 * All routes are restricted to SUPER_ADMIN only
 */
@Controller('radiology-services')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class RadiologyServiceController {
  constructor(
    private readonly radiologyServiceService: RadiologyServiceService,
  ) {}

  /**
   * Get all radiology services
   * Accessible by: SUPER_ADMIN only
   */
  @Get()
  findAll() {
    return this.radiologyServiceService.findAll();
  }

  /**
   * Get one radiology service by ID
   * Accessible by: SUPER_ADMIN only
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.radiologyServiceService.findOne(id);
  }

  /**
   * Get service statistics
   * Accessible by: SUPER_ADMIN only
   */
  @Get(':id/statistics')
  getStatistics(@Param('id') id: string) {
    return this.radiologyServiceService.getStatistics(id);
  }

  /**
   * Create a new radiology service
   * Accessible by: SUPER_ADMIN only
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createRadiologyServiceDto: CreateRadiologyServiceDto) {
    return this.radiologyServiceService.create(createRadiologyServiceDto);
  }

  /**
   * Update a radiology service
   * Accessible by: SUPER_ADMIN only
   */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateRadiologyServiceDto: UpdateRadiologyServiceDto,
  ) {
    return this.radiologyServiceService.update(id, updateRadiologyServiceDto);
  }

  /**
   * Suspend a radiology service
   * Accessible by: SUPER_ADMIN only
   */
  @Patch(':id/suspend')
  @HttpCode(HttpStatus.OK)
  suspend(@Param('id') id: string) {
    return this.radiologyServiceService.suspend(id);
  }

  /**
   * Activate a radiology service
   * Accessible by: SUPER_ADMIN only
   */
  @Patch(':id/activate')
  @HttpCode(HttpStatus.OK)
  activate(@Param('id') id: string) {
    return this.radiologyServiceService.activate(id);
  }

  /**
   * Delete a radiology service
   * Accessible by: SUPER_ADMIN only
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.radiologyServiceService.remove(id);
  }
}
