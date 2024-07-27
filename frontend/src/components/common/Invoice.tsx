import React from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableRow,
  TableCell,
  TableHeader,
} from "../ui/table";

interface Booking {
  ownerName: string;
  ownerPhone: string;
  customer: string;
  customerPhone: string;
  customerMobile: string;
  room: string;
  price: number;
  totalPaid: number;
  startDate: Date;
  endDate: Date;
  numberOfPeople: number;
  createdAt: string;
  extraBusSeats: number;
  bookingLocation: string;
  notes: string;
}

interface Payment {
  amount: number;
  date: string;
}

interface InvoiceProps {
  booking: Booking;
  payments: Payment[];
}

const Invoice: React.FC<InvoiceProps> = ({ booking, payments }) => {
  const bookingConditions = [
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
  ];

  const formatDate = (date: string) => format(new Date(date), "dd/MM/yyyy");
  // console.log(booking);
  return (
    <div
      dir="rtl"
      className="container mx-auto p-4 rtl-grid text-right hidden print:block text-base"
    >
      <div className="text-center mb-4 flex justify-around flex-row-reverse">
        <img src="/sahab.png" alt="Logo" className="w-20 h-20 -mt-10" />
        <p className="">تاريخ الحجز: {formatDate(booking.createdAt)}</p>
        <h1 className="clear-both text-center">فاتورة</h1>
      </div>
      <div className="details mb-4">
        <h2 className="text-lg font-bold">تفاصيل الحجز</h2>
        <Table className="w-full border-collapse mb-4">
          <TableBody>
            <TableRow>
              <TableCell className="border px-4 py-1">عميل</TableCell>
              <TableCell className="border px-4 py-1">
                {booking.customer}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="border px-4 py-1">رقم الهاتف</TableCell>
              <TableCell className="border px-4 py-1">
                {booking.customerPhone} - {booking.customerMobile}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="border px-4 py-1">مكان الحجز</TableCell>
              <TableCell className="border px-4 py-1">
                {booking.bookingLocation}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="border px-4 py-1">رقم الغرفة</TableCell>
              <TableCell className="border px-4 py-1">{booking.room}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="border px-4 py-1">السعر الإجمالي</TableCell>
              <TableCell className="border px-4 py-1">
                {booking.price}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="border px-4 py-1">
                المدفوع الإجمالي
              </TableCell>
              <TableCell className="border px-4 py-1">
                {booking.totalPaid}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="border px-4 py-1">الفترة</TableCell>
              <TableCell className="border px-4 py-1">
                من{" "}
                {booking.startDate.toLocaleDateString("ar-eg", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}{" "}
                إلى{" "}
                {booking.endDate.toLocaleDateString("ar-eg", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="border px-4 py-1">عدد الأفراد</TableCell>
              <TableCell className="border px-4 py-1">
                {booking.numberOfPeople}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="border px-4 py-1">
                عدد الكراسى الأضافية
              </TableCell>
              <TableCell className="border px-4 py-1">
                {booking.extraBusSeats}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="border px-4 py-1">مسئول الحجز</TableCell>
              <TableCell className="border px-4 py-1">
                {`${booking.ownerName} - ${booking.ownerPhone}`}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="border px-4 py-1">ملاحظات</TableCell>
              <TableCell className="border px-4 py-1">
                {booking.notes}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <div className="section mb-4">
        <h2 className="text-lg font-bold">المدفوعات</h2>
        <Table className="w-full border-collapse mb-4">
          <TableHeader>
            <TableRow>
              <TableCell className="border px-4 py-1">المبلغ</TableCell>
              <TableCell className="border px-4 py-1">التاريخ</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment, index) => (
              <TableRow key={index}>
                <TableCell className="border px-4 py-1">
                  {payment.amount}
                </TableCell>
                <TableCell className="border px-4 py-1">
                  {formatDate(payment.date)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="section mb-4">
        <h2 className="text-lg font-bold">شــــــــروط الحجـــز</h2>
        <div className="conditions">
          {bookingConditions.map((condition, index) => (
            <p key={index} className="text-sm">
              {index + 1}. {condition}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Invoice;
