import pug from "pug";
import puppeteer from "puppeteer";
import path from "path";
import { format } from "date-fns";
import { IDeal } from "../models/dealModel";
import { IPartialPayment } from "../models/partialPaymentModel";

const generateInvoice = async (
  booking: IDeal,
  payments: IPartialPayment[]
): Promise<Buffer> => {
  const templatePath = path.join(__dirname, "invoice.pug");
  const html = pug.renderFile(templatePath, {
    booking,
    payments,
    formatDate: (date: string | Date) => format(new Date(date), "dd/MM/yyyy"),
  });

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    timeout: 60000,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4" });
    await browser.close();
    return Buffer.from(pdfBuffer);
  } catch (error) {
    await browser.close();
    console.error("Error generating PDF:", error);
    throw error;
  }
};

export default generateInvoice;
