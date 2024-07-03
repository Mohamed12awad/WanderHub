import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface DateFormProps {
  onSubmit: (startDate: string, endDate: string, location: string) => void;
  searchByLocation: boolean;
}

const DateForm: React.FC<DateFormProps> = ({ onSubmit, searchByLocation }) => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [location, setLocation] = useState("");
  const [key, setKey] = React.useState(+new Date());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (startDate && endDate) {
      onSubmit(startDate, endDate, location);
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
      {searchByLocation && (
        <div className="flex flex-col md:col-span-2">
          <Label htmlFor="location">Location:</Label>
          {/* <Input
          id="location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Optional"
        /> */}
          <Select key={key} onValueChange={(value) => setLocation(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent className="overflow-y-auto max-h-[10rem]">
              <SelectItem value="Alex">Alex</SelectItem>
              <SelectItem value="Cairo">Cairo</SelectItem>
              <Button
                className="w-full px-2 mt-3"
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setLocation("");
                  setKey(+new Date());
                }}
              >
                Clear
              </Button>
            </SelectContent>
          </Select>
        </div>
      )}
      <Button className="md:col-span-2" type="submit">
        Generate Report
      </Button>
    </form>
  );
};

export default DateForm;
