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
import { SuperAdminService } from './super-admin.service';
import { CreateSuperAdminDto } from './dto/create-super-admin.dto';
import { UpdateSuperAdminDto } from './dto/update-super-admin.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';

/**
 * SuperAdmin Controller - Manages platform administrators
 * All routes are restricted to SUPER_ADMIN only
 */
@Controller('super-admins')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  /**
   * Get all super admins
   * Accessible by: SUPER_ADMIN only
   */
  @Get()
  findAll() {
    return this.superAdminService.findAll();
  }

  /**
   * Get one super admin by ID
   * Accessible by: SUPER_ADMIN only
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.superAdminService.findOne(id);
  }

  /**
   * Create a new super admin
   * Accessible by: SUPER_ADMIN only
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createSuperAdminDto: CreateSuperAdminDto) {
    return this.superAdminService.create(createSuperAdminDto);
  }

  /**
   * Update a super admin
   * Accessible by: SUPER_ADMIN only
   */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSuperAdminDto: UpdateSuperAdminDto,
  ) {
    return this.superAdminService.update(id, updateSuperAdminDto);
  }

  /**
   * Deactivate a super admin
   * Accessible by: SUPER_ADMIN only
   */
  @Patch(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  deactivate(@Param('id') id: string) {
    return this.superAdminService.deactivate(id);
  }

  /**
   * Activate a super admin
   * Accessible by: SUPER_ADMIN only
   */
  @Patch(':id/activate')
  @HttpCode(HttpStatus.OK)
  activate(@Param('id') id: string) {
    return this.superAdminService.activate(id);
  }

  /**
   * Delete a super admin
   * Accessible by: SUPER_ADMIN only
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.superAdminService.remove(id);
  }
}
