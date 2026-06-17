import { Module } from '@nestjs/common';
import { CostCentersController } from './cost-centers.controller';
import { CostCentersService } from './cost-centers.service';

// PrismaService is provided globally, so no imports are needed here.
@Module({
  controllers: [CostCentersController],
  providers: [CostCentersService],
})
export class CostCentersModule {}
