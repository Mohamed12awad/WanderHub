import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { handlePrismaError } from '../common/prisma-error';

@Controller('customers')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @RequirePermission('contacts:view')
  async findAll(@Query() query: Record<string, string>, @Res() res: Response) {
    try {
      return res.json(await this.customers.findAll(query));
    } catch (error) {
      return res.status(500).json({ message: (error as Error).message });
    }
  }

  @Get(':id')
  @RequirePermission('contacts:view')
  async findOne(@Param('id') id: string, @Res() res: Response) {
    try {
      const customer = await this.customers.findOne(id);
      if (!customer) return res.status(404).json({ message: 'Customer not found' });
      return res.json(customer);
    } catch (error) {
      return res.status(500).json({ message: (error as Error).message });
    }
  }

  @Post()
  @RequirePermission('contacts:create')
  async create(
    @Body() body: CreateCustomerDto,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    try {
      const customer = await this.customers.create(body, user.id);
      return res.status(201).json(customer);
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }

  @Put(':id')
  @RequirePermission('contacts:edit')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateCustomerDto,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    try {
      const customer = await this.customers.update(id, body, user.id);
      if (!customer) return res.status(404).json({ message: 'Customer not found' });
      return res.json(customer);
    } catch (error) {
      return handlePrismaError(error, res);
    }
  }

  @Delete(':id')
  @RequirePermission('contacts:delete')
  async remove(@Param('id') id: string, @Res() res: Response) {
    try {
      const ok = await this.customers.remove(id);
      if (!ok) return res.status(404).json({ message: 'Customer not found' });
      return res
        .status(204)
        .json({ message: 'Customer, related deals, and payments deleted' });
    } catch (error) {
      return res.status(500).json({ message: (error as Error).message });
    }
  }
}
