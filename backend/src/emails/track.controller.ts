import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

// 1x1 transparent GIF.
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

/**
 * Public (unauthenticated) email-tracking endpoints hit by mail clients.
 * Failures must never surface to the recipient — always return the pixel /
 * redirect even if the tracking write fails.
 */
@Controller('track')
export class TrackController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('o/:id')
  async open(@Param('id') id: string, @Res() res: Response) {
    try {
      const email = await this.prisma.trackedEmail.findUnique({ where: { id } });
      if (email) {
        await this.prisma.trackedEmail.update({
          where: { id },
          data: { openCount: { increment: 1 }, openedAt: email.openedAt ?? new Date() },
        });
      }
    } catch {
      /* swallow — tracking must not break the email */
    }
    res.set({ 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, must-revalidate' });
    res.end(PIXEL);
  }

  @Get('c/:id')
  async click(@Param('id') id: string, @Query('u') u: string, @Res() res: Response) {
    let target: string;
    try {
      target = decodeURIComponent(u ?? '');
    } catch {
      target = '';
    }
    // Only allow http(s) redirects.
    const safe = /^https?:\/\//i.test(target) ? target : (process.env.APP_URL ?? '/');
    try {
      const email = await this.prisma.trackedEmail.findUnique({ where: { id } });
      if (email) {
        await this.prisma.trackedEmail.update({
          where: { id },
          data: {
            clickCount: { increment: 1 },
            clickedAt: email.clickedAt ?? new Date(),
            openedAt: email.openedAt ?? new Date(), // a click implies an open
          },
        });
      }
    } catch {
      /* swallow */
    }
    res.redirect(302, safe);
  }
}
