const pug = require("pug");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const { format } = require("date-fns");

const generateInvoice = async (booking, payments) => {
  const templatePath = path.join(__dirname, "invoice.pug");
  const html = pug.renderFile(templatePath, {
    booking,
    payments,
    bookingConditions: [
      "يقر العميل بأنه قد قام بمراجعة البيانات وان جميع البيانات المذكورة صحيحة.",
      "يقر العميل بأن عدد الأفراد المذكور في طلب الحجز هو العدد الفعلي وفي حالة دخول اكثر من هذا العدد يتم محاسبتهم نقدا قبل التسكين.",
      "يقر العميل بإلتزامه بالمواعيد المحددة للتسكين والمغادرة، والتعليمات الخاصة من الفندق وذلك دون ادنى مسئولية من الشركة.",
      "يرجى العلم بأن في حالة حجز غرفة ثلاثية يتم استلام غرفة مزدوجة وبعد ميعاد التسكين يتم اضافة سرير.",
      "يقر العميل بأن هذا الحجز غير قابل للإلغاء او رد قيمة المبلغ المدفوع وذلك قبل ميعاد السفر بأسبوعين.",
      "في حالة إلغاء الحجز يتم خصم قيمة ليلة من اجمالي اقامة الفندق وذلك بحد اقصى اسبوعين عن ميعاد السفر.",
      "في حالة حجز العميل بالأنتقالات تلتزم الشركة بتوصيل العميل الي مكان الحجز دون ادنى مسئولية علي الشركة.",
      "الشركة غير مسئولة عن اي اعطال او تأخيرات خارجه عن ارادتها او اي مفقودات او تلفيات وهي مسئولية العميل.",
      "في حالة عدم امكانية الشركة اتمام الحجز لأي سبب خارجه عن ارادتها تكون ملزمه برد المبلغ المدفوع او تغيير الحجز.",
      "يرجى العلم بأن اذا زادت اسعار السولار سيتم زيادة السعر.",
      "الشركة غير مسئولة عن المتعلقات الشخصية للعميل.",
      "يقر العميل بأنه قد قرأ جميع الشروط السابقة والموافقة قبل التوقيع على طلب الحجز.",
    ],
    formatDate: (date) => format(new Date(date), "dd/MM/yyyy"),
  });

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    timeout: 60000, // increase timeout to 60 seconds
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4" });
    await browser.close();
    return pdfBuffer;
  } catch (error) {
    await browser.close();
    console.error("Error generating PDF:", error);
    throw error;
  }
};

module.exports = generateInvoice;
