import React, { useEffect } from "react";

interface Customer {
  name: string;
  phone: string;
}

interface Room {
  roomNumber: string;
}

interface Booking {
  _id: string;
  customer: Customer;
  room: Room;
  price: number;
  totalPaid: number;
  status: string;
}

interface Payment {
  _id: string;
  booking?: { _id: string };
  amount: number;
  date: string;
  currency: string;
}

interface Purchase {
  _id: string;
  itemName: string;
  quantity: number;
  price: number;
  landedCost: number;
}

interface Expense {
  _id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
}

interface ReportData {
  bookings: Booking[];
  payments: Payment[];
  purchases: Purchase[];
  expenses: Expense[];
}

const ReportComponent: React.FC<{ reportData: ReportData }> = ({
  reportData,
}) => {
  useEffect(() => {
    document.body.style.overflow = "auto";
  }, []);

  const { bookings, payments, purchases, expenses } = reportData;

  const renderSection = <T,>(
    title: string,
    data: T[],
    renderItem: (item: T, index: number) => JSX.Element
  ) =>
    data.length > 0 && (
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div className="space-y-4">
          {data.map((item, index) => renderItem(item, index))}
        </div>
      </div>
    );

  const renderBooking = (booking: Booking) => (
    <div key={booking._id} className="p-4 mb-4 border rounded-lg bg-white">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h5 className="text-lg font-medium">
            Customer: {booking.customer.name}
          </h5>
          <p>Phone: {booking.customer.phone}</p>
          <p>Room: {booking.room.roomNumber}</p>
          <p>Total Price: {booking.price}</p>
          <p>Total Paid: {booking.totalPaid}</p>
          <p>Status: {booking.status}</p>
        </div>
        <div>
          <h5 className="text-lg font-medium mb-2">Payments</h5>
          {payments
            .filter((payment) => payment.booking?._id === booking._id)
            .map((payment, index) => renderPayment(payment, index))}
        </div>
      </div>
    </div>
  );

  const renderPayment = (payment: Payment, index: number) => (
    <div key={payment._id} className="flex items-center space-x-4">
      <div className="border-r pr-4">{index + 1}</div>
      <div>
        <p>
          Amount: {payment.amount} {payment.currency}
        </p>
        <p>Date: {new Date(payment.date).toLocaleString()}</p>
      </div>
    </div>
  );

  const renderPurchase = (purchase: Purchase) => (
    <div key={purchase._id} className="p-4 mb-4 border rounded-lg">
      <h5 className="text-lg font-medium">Purchase Details</h5>
      <p>Item: {purchase.itemName}</p>
      <p>Quantity: {purchase.quantity}</p>
      <p>Price: {purchase.price}</p>
      <p>Landed Cost: {purchase.landedCost}</p>
    </div>
  );

  const renderExpense = (expense: Expense) => (
    <div key={expense._id} className="p-4 mb-4 border rounded-lg">
      <h5 className="text-lg font-medium">Expense Details</h5>
      <p>Description: {expense.description}</p>
      <p>Amount: {expense.amount}</p>
      <p>Date: {new Date(expense.date).toLocaleString()}</p>
      <p>Category: {expense.category}</p>
    </div>
  );

  return (
    <div className="report p-6">
      {/* <h1 className="text-3xl font-bold mb-4">Report</h1> */}
      {renderSection("Bookings", bookings, renderBooking)}
      {renderSection("Payments", payments, renderPayment)}
      {renderSection("Purchases", purchases, renderPurchase)}
      {renderSection("Expenses", expenses, renderExpense)}
      {bookings.length === 0 &&
        payments.length === 0 &&
        purchases.length === 0 &&
        expenses.length === 0 && (
          <p className="text-center text-gray-500">
            No data available for the selected period.
          </p>
        )}
    </div>
  );
};

export default ReportComponent;
