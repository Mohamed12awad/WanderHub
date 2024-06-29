import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface DateFormProps {
  onSubmit: (startDate: string, endDate: string) => void;
}

const DateForm: React.FC<DateFormProps> = ({ onSubmit }) => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (startDate && endDate) {
      onSubmit(startDate, endDate);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 md:grid-cols-2 gap-4 px-3 mt-5 print:hidden"
    >
      <div className="flex flex-col">
        <Label htmlFor="start-date">Start Date:</Label>
        <Input
          id="start-date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>
      <div className="flex flex-col">
        <Label htmlFor="end-date">End Date:</Label>
        <Input
          id="end-date"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>
      <Button className="md:col-span-2" type="submit">
        Generate Report
      </Button>
    </form>
  );
};

export default DateForm;
