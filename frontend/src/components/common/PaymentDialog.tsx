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
import { BadgeDollarSign } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { PaymentData } from "@/types/types";

interface PaymentProps {
  id: string;
}

export const PaymentDialog: React.FC<PaymentProps> = ({ id }) => {
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState("");
  const [currency, setCurrency] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

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
      method,
      currency,
      date,
      notes,
    };

    try {
      await mutate(formData);
      setAmount(0);
      setMethod("");
      setCurrency("");
      setNotes("");
    } catch (error) {
      console.error("Error creating payment:", error);
      // Handle error as needed
    }
  };

  return (
    <Dialog>
      <LoadingSpinner loading={isLoading} />
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 md:gap-1 md:px-5 px-3"
        >
          <BadgeDollarSign className="h-5 w-5 me-1" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Make Payment
          </span>
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
            <div className="grid grid-cols-4 items-center gap-4 ">
              <Label className="text-right" htmlFor="method">
                Method
              </Label>
              <div className="col-span-3">
                <Select
                  required
                  defaultValue="cash"
                  value={method}
                  onValueChange={(value) => setMethod(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Payment Method" />
                  </SelectTrigger>
                  <SelectContent className="overflow-y-auto max-h-[15rem] capitalize">
                    <SelectItem value="cash">cash</SelectItem>
                    <SelectItem value="bank transfer">bank transfer</SelectItem>
                    <SelectItem value="vodafone cash">vodafone cash</SelectItem>
                    <SelectItem value="cheque">cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4 ">
              <Label className="text-right" htmlFor="method">
                Currency
              </Label>
              <div className="col-span-3">
                <Select
                  required
                  value={currency}
                  defaultValue="EGP"
                  onValueChange={(value) => setCurrency(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent className="overflow-y-auto max-h-[15rem]">
                    <SelectItem value="EGP">EGP</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                Notes
              </Label>
              <textarea
                id="notes"
                name="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
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
