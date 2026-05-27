import * as pug from 'pug';
import puppeteer from 'puppeteer';
import * as path from 'path';
import { format } from 'date-fns';

/**
 * Renders a deal/booking invoice to a PDF buffer using the legacy pug
 * template that still lives under backend/utils/invoice.pug.
 */
export async function generateInvoice(
  booking: any,
  payments: any[],
): Promise<Buffer> {
  const templatePath = path.join(process.cwd(), 'utils', 'invoice.pug');
  const html = pug.renderFile(templatePath, {
    booking,
    payments,
    formatDate: (date: string | Date) => format(new Date(date), 'dd/MM/yyyy'),
  });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    timeout: 60000,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4' });
    await browser.close();
    return Buffer.from(pdfBuffer);
  } catch (error) {
    await browser.close();
    console.error('Error generating PDF:', error);
    throw error;
  }
}
