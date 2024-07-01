import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { createExpense } from "@/utils/api";
import { Link, useNavigate } from "react-router-dom";
import { CircleArrowLeft, Minus } from "lucide-react";
import { AxiosError } from "axios";
import { ErrorResponse, ExpenseReportData } from "@/types/types";
import LoadingSpinner from "../common/spinner";
import { ScrollArea, ScrollBar } from "../ui/scroll-area";

const initialFormData: ExpenseReportData = {
  title: "",
  userId: "",
  expenses: [
    {
      description: "",
      amount: 0,
      date: new Date().toISOString().split("T")[0],
      category: "",
      beneficiary: "",
    },
  ],
  approved: false,
};

interface FormErrors {
  title?: string;
  expenses?: string;
}

const AddExpenseReport: React.FC = () => {
  const [formData, setFormData] = useState<ExpenseReportData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
    setErrors((prevErrors) => ({
      ...prevErrors,
      [name]: "",
    }));
  };

  const handleExpenseChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    index: number
  ) => {
    const { name, value } = e.target;
    const newExpenses = [...formData.expenses];
    newExpenses[index] = {
      ...newExpenses[index],
      [name]: name === "amount" ? Number(value) : value,
    };
    setFormData((prevData) => ({
      ...prevData,
      expenses: newExpenses,
    }));
    setErrors((prevErrors) => ({
      ...prevErrors,
      expenses: "",
    }));
  };

  const addExpenseField = () => {
    setFormData((prevData) => ({
      ...prevData,
      expenses: [
        ...prevData.expenses,
        {
          description: "",
          amount: 0,
          date: new Date().toISOString().split("T")[0],
          category: "",
          beneficiary: "",
        },
      ],
    }));
  };
  const removeExpenseField = (index: number) => {
    setFormData((prevData) => ({
      ...prevData,
      expenses: prevData.expenses.filter((_, i) => i !== index),
    }));
  };

  const validateForm = () => {
    const newErrors: FormErrors = {};
    if (!formData.title) newErrors.title = "Title is required";
    if (
      formData.expenses.some(
        (expense) =>
          !expense.description ||
          !expense.amount ||
          !expense.date ||
          !expense.category ||
          !expense.beneficiary
      )
    ) {
      newErrors.expenses = "All expense fields are required";
    }
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formValidationErrors = validateForm();
    if (Object.keys(formValidationErrors).length > 0) {
      setErrors(formValidationErrors);
      return;
    }

    const expenseReportData: ExpenseReportData = {
      ...formData,
      expenses: formData.expenses.map((expense) => ({
        ...expense,
        amount: Number(expense.amount),
        date: expense.date,
      })),
    };

    try {
      setIsLoading(true);
      await createExpense(expenseReportData);
      setIsLoading(false);
      navigate("/expenses");
    } catch (error) {
      setIsLoading(false);
      console.error("Error adding expense report:", error);

      const axiosError = error as AxiosError<ErrorResponse>;
      const errMsg = axiosError.response?.data?.message;
      console.error("Error creating expense report:", errMsg);
      alert(errMsg);
    }
  };

  return (
    <main className="p-4">
      <LoadingSpinner loading={isLoading} />
      <Card>
        <CardHeader>
          <CardTitle className="flex">
            <Link to="/expenses">
              <CircleArrowLeft className="me-3" />
            </Link>
            Add Expense Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="my-4">
            <div className="">
              <h2 className="text-lg font-semibold mb-2">Report Information</h2>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="title">
                  Title
                </Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                />
                {errors.title && (
                  <span className="text-red-500">{errors.title}</span>
                )}
              </div>
            </div>
            <div className="">
              <h2 className="text-lg font-semibold mb-2">Expenses</h2>
              <ScrollArea className="w-full rounded-md border p-4">
                {formData.expenses.map((expense, index) => (
                  <div
                    key={index}
                    className="mb-4 ms-5 grid grid-cols-3 lg:grid-cols-5 gap-4"
                  >
                    <Button
                      variant="outline"
                      className="rounded-full absolute left-1 mt-11 p-0 h-7 w-7"
                      size="icon"
                      onClick={() => removeExpenseField(index)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <div className="flex flex-col col-span-3 md:col-span-1">
                      <Label className="my-3" htmlFor={`description-${index}`}>
                        Description
                      </Label>
                      <Input
                        id={`description-${index}`}
                        name="description"
                        value={expense.description}
                        onChange={(e) => handleExpenseChange(e, index)}
                        required
                      />
                    </div>
                    <div className="flex flex-col col-span-3 md:col-span-1">
                      <Label className="my-3" htmlFor={`amount-${index}`}>
                        Amount
                      </Label>
                      <Input
                        id={`amount-${index}`}
                        name="amount"
                        type="number"
                        value={expense.amount.toString()}
                        onChange={(e) => handleExpenseChange(e, index)}
                        required
                      />
                    </div>
                    <div className="flex flex-col col-span-3 md:col-span-1">
                      <Label className="my-3" htmlFor={`date-${index}`}>
                        Date
                      </Label>
                      <Input
                        id={`date-${index}`}
                        name="date"
                        type="date"
                        value={
                          expense.date
                            ? new Date().toISOString().split("T")[0]
                            : ""
                        }
                        onChange={(e) => handleExpenseChange(e, index)}
                        required
                      />
                    </div>
                    <div className="flex flex-col col-span-3 md:col-span-1">
                      <Label className="my-3" htmlFor={`category-${index}`}>
                        Category
                      </Label>
                      <Select
                        name="category"
                        value={expense.category}
                        onValueChange={(value) =>
                          handleExpenseChange(
                            {
                              target: { name: "category", value },
                            } as React.ChangeEvent<HTMLInputElement>,
                            index
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent
                          id={`category-${index}`}
                          className="overflow-y-auto max-h-[10rem]"
                        >
                          <SelectItem value="Marketing">
                            Marketing and advertising
                          </SelectItem>
                          <SelectItem value="Transportation">
                            Transportation
                          </SelectItem>
                          <SelectItem value="Utilities">Utilities</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col col-span-3 md:col-span-1">
                      <Label className="my-3" htmlFor={`beneficiary-${index}`}>
                        Beneficiary
                      </Label>
                      <Input
                        id={`beneficiary-${index}`}
                        name="beneficiary"
                        value={expense.beneficiary}
                        onChange={(e) => handleExpenseChange(e, index)}
                        required
                      />
                    </div>
                    <hr className="col-span-3 md:col-span-5 my-3" />
                  </div>
                ))}
                <div className="flex justify-end mt-3">
                  <Button type="button" onClick={addExpenseField}>
                    Add Row
                  </Button>
                </div>
                {errors.expenses && (
                  <span className="text-red-500">{errors.expenses}</span>
                )}
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
            <div className="col-span-2 mt-5">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Adding..." : "Add Expense Report"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};

export default AddExpenseReport;
