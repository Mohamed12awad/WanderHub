import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CostCentersService } from './cost-centers.service';
import { CreateCostCenterDto, UpdateCostCenterDto } from './dto/cost-center.dto';

@Controller('cost-centers')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class CostCentersController {
  constructor(private readonly costCenters: CostCentersService) {}

  // Reads are open to any authenticated user — cost centers are reference data
  // needed to populate selectors on invoices, bills and expenses. Writes below
  // are gated behind `accounting:manage`.
  @Get()
  findAll(@Query() query: Record<string, string>) {
    return this.costCenters.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.costCenters.findOne(id);
  }

  @Post()
  @HttpCode(201)
  @RequirePermission('accounting:manage')
  create(@Body() body: CreateCostCenterDto) {
    return this.costCenters.create(body);
  }

  @Patch(':id')
  @RequirePermission('accounting:manage')
  update(@Param('id') id: string, @Body() body: UpdateCostCenterDto) {
    return this.costCenters.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('accounting:manage')
  remove(@Param('id') id: string) {
    return this.costCenters.remove(id);
  }
}
