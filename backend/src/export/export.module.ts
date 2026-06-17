import { Module } from '@nestjs/common';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';

// ExportService depends only on PrismaService + VisibilityService (both provided
// globally / via CommonModule), so no feature modules need importing here.
@Module({
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
