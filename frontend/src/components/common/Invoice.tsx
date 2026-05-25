import React from "react";
import { format } from "date-fns";
import { Table, TableBody, TableRow, TableCell, TableHeader } from "../ui/table";

interface DealSummary {
  title?: string;
  customer: string;
  customerPhone?: string;
  product?: string;
  price: number;
  totalPaid: number;
  currency?: string;
  status?: string;
  source?: string;
  expectedCloseDate?: Date | null;
  quantity?: number;
  notes?: string;
  createdAt: string;
}

interface Payment {
  amount: number;
  date: string;
  method?: string;
  currency?: string;
}

interface InvoiceProps {
  booking: DealSummary;
  payments: Payment[];
}

const Invoice: React.FC<InvoiceProps> = ({ booking, payments }) => {
  const formatDate = (date: string | Date) =>
    format(new Date(date), "dd/MM/yyyy");

  const outstanding = booking.price - booking.totalPaid;

  return (
    <div className="container mx-auto p-8 hidden print:block text-sm">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Invoice</h1>
          <p className="text-gray-500">Date: {formatDate(booking.createdAt)}</p>
        </div>
        <img src="/logo.png" alt="Logo" className="h-12" />
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold border-b pb-1 mb-3">Deal Details</h2>
        <Table className="w-full border-collapse">
          <TableBody>
            {booking.title && (
              <TableRow>
                <TableCell className="border px-4 py-1 font-medium w-1/3">Deal</TableCell>
                <TableCell className="border px-4 py-1">{booking.title}</TableCell>
              </TableRow>
            )}
            <TableRow>
              <TableCell className="border px-4 py-1 font-medium">Customer</TableCell>
              <TableCell className="border px-4 py-1">{booking.customer}</TableCell>
            </TableRow>
            {booking.customerPhone && (
              <TableRow>
                <TableCell className="border px-4 py-1 font-medium">Phone</TableCell>
                <TableCell className="border px-4 py-1">{booking.customerPhone}</TableCell>
              </TableRow>
            )}
            {booking.product && (
              <TableRow>
                <TableCell className="border px-4 py-1 font-medium">Product / Service</TableCell>
                <TableCell className="border px-4 py-1">{booking.product}</TableCell>
              </TableRow>
            )}
            {booking.quantity !== undefined && booking.quantity > 0 && (
              <TableRow>
                <TableCell className="border px-4 py-1 font-medium">Quantity</TableCell>
                <TableCell className="border px-4 py-1">{booking.quantity}</TableCell>
              </TableRow>
            )}
            {booking.status && (
              <TableRow>
                <TableCell className="border px-4 py-1 font-medium">Status</TableCell>
                <TableCell className="border px-4 py-1 capitalize">{booking.status}</TableCell>
              </TableRow>
            )}
            {booking.source && (
              <TableRow>
                <TableCell className="border px-4 py-1 font-medium">Source</TableCell>
                <TableCell className="border px-4 py-1">{booking.source}</TableCell>
              </TableRow>
            )}
            <TableRow>
              <TableCell className="border px-4 py-1 font-medium">Total Price</TableCell>
              <TableCell className="border px-4 py-1">
                {booking.price.toLocaleString()} {booking.currency ?? ""}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="border px-4 py-1 font-medium">Total Paid</TableCell>
              <TableCell className="border px-4 py-1">
                {booking.totalPaid.toLocaleString()} {booking.currency ?? ""}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="border px-4 py-1 font-medium">Outstanding</TableCell>
              <TableCell className="border px-4 py-1 font-semibold text-red-600">
                {outstanding.toLocaleString()} {booking.currency ?? ""}
              </TableCell>
            </TableRow>
            {booking.notes && (
              <TableRow>
                <TableCell className="border px-4 py-1 font-medium">Notes</TableCell>
                <TableCell className="border px-4 py-1">{booking.notes}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {payments.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold border-b pb-1 mb-3">Payment History</h2>
          <Table className="w-full border-collapse">
            <TableHeader>
              <TableRow>
                <TableCell className="border px-4 py-1 font-medium">#</TableCell>
                <TableCell className="border px-4 py-1 font-medium">Amount</TableCell>
                <TableCell className="border px-4 py-1 font-medium">Method</TableCell>
                <TableCell className="border px-4 py-1 font-medium">Date</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment, index) => (
                <TableRow key={index}>
                  <TableCell className="border px-4 py-1">{index + 1}</TableCell>
                  <TableCell className="border px-4 py-1">
                    {payment.amount.toLocaleString()} {payment.currency ?? ""}
                  </TableCell>
                  <TableCell className="border px-4 py-1 capitalize">{payment.method ?? "—"}</TableCell>
                  <TableCell className="border px-4 py-1">{formatDate(payment.date)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="mt-8 text-xs text-gray-400 text-center border-t pt-4">
        Generated by WonderHub CRM
      </div>
    </div>
  );
};

export default Invoice;
