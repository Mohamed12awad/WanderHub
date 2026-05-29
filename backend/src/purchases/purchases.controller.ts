import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';

@Controller('purchases')
@UseGuards(JwtAuthGuard)
export class PurchasesController {
  constructor(private readonly purchases: PurchasesService) {}

  @Get()
  async findAll(@Res() res: Response) {
    try { return res.json(await this.purchases.findAll()); }
    catch (e) { return res.status(500).json({ message: (e as Error).message }); }
  }

  @Post()
  async create(@Body() body: CreatePurchaseDto, @Res() res: Response) {
    try { return res.status(201).json(await this.purchases.create(body)); }
    catch (e) { return res.status(400).json({ message: (e as Error).message }); }
  }
}
