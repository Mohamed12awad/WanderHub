import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPayment } from "@/utils/api";
import LoadingSpinner from "./spinner";
import { useMutation, useQueryClient } from "react-query";

interface PaymentData {
  booking: string;
  amount: number;
  date: string;
}

interface PaymentProps {
  id: string;
}

export const PaymentDialog: React.FC<PaymentProps> = ({ id }) => {
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const { mutate, isLoading } = useMutation(createPayment, {
    onSuccess: () => {
      queryClient.invalidateQueries("bookings"); // Invalidate and refetch the 'customers' query
    },
    onError: (error) => {
      console.error("Error creating payment:", error);
      // Optionally handle error, e.g., show an error message
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData: PaymentData = {
      booking: id,
      amount,
      date,
    };

    try {
      await mutate(formData);
    } catch (error) {
      console.error("Error creating payment:", error);
      // Handle error as needed
    }
  };

  return (
    <Dialog>
      <LoadingSpinner loading={isLoading} />
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1 px-5 py-2">
          Make Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Receive Payment</DialogTitle>
          <DialogDescription>
            Enter payment details below and click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Amount
              </Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                Date of payment
              </Label>
              <Input
                id="date"
                name="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogTrigger asChild>
              <Button type="submit">Save changes</Button>
            </DialogTrigger>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
