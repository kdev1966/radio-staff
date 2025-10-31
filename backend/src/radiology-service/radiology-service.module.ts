import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RadiologyServiceService } from './radiology-service.service';
import { RadiologyServiceController } from './radiology-service.controller';
import { RadiologyService } from '../entities/radiology-service.entity';
import { Employee } from '../entities/employee.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RadiologyService, Employee])],
  controllers: [RadiologyServiceController],
  providers: [RadiologyServiceService],
  exports: [RadiologyServiceService],
})
export class RadiologyServiceModule {}
