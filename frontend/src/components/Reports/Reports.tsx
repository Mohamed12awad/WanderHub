import React, { useState, Suspense } from "react";
import DateForm from "./DateForm";
import { getBookingReport, getReport } from "@/utils/api";
// import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import LoadingSpinner from "../common/spinner";
import { useAuth } from "@/contexts/authContext";
import { Button } from "../ui/button";
import { Printer } from "lucide-react";

const ReportComponent = React.lazy(() => import("./ReportComponent"));
const BookingReportComponent = React.lazy(() => import("./BookingsReport"));

const Reports: React.FC = () => {
  const [reportData, setReportData] = useState(null);
  const [bookingReportData, setBookingReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchReport = async (
    startDate: string,
    endDate: string,
    location: string
  ) => {
    try {
      const params = { startDate, endDate, location };
      setLoading(true);
      const response = await getReport(params);
      setReportData(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching report:", error);
    }
  };

  const fetchBookingReport = async (
    startDate: string,
    endDate: string,
    location: string
  ) => {
    try {
      const params = { startDate, endDate, location };
      setLoading(true);
      const response = await getBookingReport(params);
      setBookingReportData(response.data);
      // console.log(bookingReportData);
      // console.log(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching booking report:", error);
    }
  };

  return (
    <div className="grid flex-1 mt-4 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
      <LoadingSpinner loading={loading} />
      <Tabs defaultValue="Booking">
        <div className="flex justify-between items-center">
          <TabsList className="text-center print:hidden">
            <TabsTrigger value="Booking">Booking Report</TabsTrigger>
            <TabsTrigger
              disabled={
                ["admin", "super admin"].includes(user!.role) ? false : true
              }
              value="full"
            >
              Full Report
            </TabsTrigger>
          </TabsList>
          <Button
            variant="outline"
            size="sm"
            className="h-8 md:gap-1 md:px-5 px-3 print:hidden"
            onClick={() => print()}
          >
            <Printer className="h-3.5 w-3.5 me-1" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Print
            </span>
          </Button>{" "}
        </div>

        <TabsContent value="full">
          <DateForm onSubmit={fetchReport} searchByLocation={false} />
          {/* <h2 className="text-center my-4 text-2xl font-bold">Full Report</h2> */}
          <Suspense fallback={<div>Loading report...</div>}>
            {reportData && <ReportComponent reportData={reportData} />}
          </Suspense>
        </TabsContent>

        <TabsContent value="Booking">
          <DateForm onSubmit={fetchBookingReport} searchByLocation={true} />
          {/* <h2 className="text-center my-4 text-2xl font-bold">
            Booking Report
          </h2> */}
          <Suspense fallback={<div>Loading report...</div>}>
            {bookingReportData && (
              <BookingReportComponent bookings={bookingReportData} />
            )}
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
