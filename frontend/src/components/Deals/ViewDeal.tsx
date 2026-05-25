import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDealById, deletePayment } from "@/utils/api";
import { Link, useParams } from "react-router-dom";
import { CircleArrowLeft, Edit, Printer } from "lucide-react";
import PaymentRow from "./PaymentsRow";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { PaymentDialog } from "../common/PaymentDialog";
import { Button } from "../ui/button";
import LoadingSpinner from "../common/spinner";
import Invoice from "../common/Invoice";
import { ActivityList } from "@/components/Activities/ActivityList";
import { RecordTimeline } from "@/components/common/RecordTimeline";
import { NotesPanel } from "@/components/common/NotesPanel";
import FinanceTab from "@/components/Finance/FinanceTab";

const STATUS_COLORS: Record<string, string> = {
  lead: "bg-blue-100 text-blue-700",
  qualified: "bg-purple-100 text-purple-700",
  proposal: "bg-yellow-100 text-yellow-700",
  negotiation: "bg-orange-100 text-orange-700",
  won: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

interface DealData {
  _id: string;
  title: string;
  customerID: string;
  customer: string;
  customerPhone: string;
  product: string;
  price: number;
  currency: string;
  totalPaid: number;
  status: string;
  quantity: number;
  source: string;
  expectedCloseDate: Date | null;
  notes: string;
  createdAt: string;
}

interface PaymentData {
  _id: string;
  amount: number;
  currency: string;
  date: string;
  method: string;
  createdAt: Date;
  createdBy: { name: string };
  notes: string;
}

const ViewDeal = () => {
  const queryClient = useQueryClient();
  const { id: dealId } = useParams<{ id: string }>();

  const { data: dealData, isLoading, error } = useQuery(
    ["deals", dealId],
    () => getDealById(dealId!)
  );

  const [formData, setFormData] = useState<DealData | null>(null);
  const [payments, setPayments] = useState<PaymentData[]>([]);

  const mutation = useMutation(deletePayment, {
    onSuccess: () => queryClient.invalidateQueries(["deals", dealId]),
  });

  useEffect(() => {
    if (!dealData?.data) return;
    const d = dealData.data.deal;
    setPayments(dealData.data.payments ?? []);
    setFormData({
      ...d,
      customerID: d.customer?._id,
      customer: d.customer?.name,
      customerPhone: d.customer?.phone,
      product: d.product?.name ?? "—",
      price: Number(d.price),
      totalPaid: Number(d.totalPaid),
      quantity: Number(d.quantity),
      expectedCloseDate: d.expectedCloseDate ? new Date(d.expectedCloseDate) : null,
    });
  }, [dealData]);

  if (!formData) return <LoadingSpinner loading={!formData} />;
  if (error) return <div className="p-4">Error loading deal</div>;

  const outstanding = formData.price - formData.totalPaid;

  return (
    <main className="p-4">
      <LoadingSpinner loading={isLoading} />
      <Card className="print:hidden">
        <CardHeader className="flex flex-row justify-between">
          <CardTitle className="flex items-center gap-3">
            <Link to="/deals"><CircleArrowLeft /></Link>
            View Deal
          </CardTitle>
          <div className="flex gap-2">
            <Link to={`/deals/${dealId}/edit`}>
              <Button size="sm" className="h-8 px-4">
                <Edit className="h-3.5 w-3.5 me-1" />Edit
              </Button>
            </Link>
            <PaymentDialog id={formData._id} />
            <Button variant="ghost" size="sm" className="h-8 px-4" onClick={() => print()}>
              <Printer className="h-3.5 w-3.5 me-1" />Invoice
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold mb-3">Deal Information</h2>
              <InfoRow label="Title" value={formData.title} />
              <InfoRow label="Customer">
                <Link to={`/customers/${formData.customerID}`} className="text-blue-500">{formData.customer}</Link>
              </InfoRow>
              <InfoRow label="Phone" value={formData.customerPhone} />
              <InfoRow label="Product" value={formData.product} />
              <InfoRow label="Quantity" value={formData.quantity} />
              <InfoRow label="Status">
                <Badge className={STATUS_COLORS[formData.status] ?? ""} variant="outline">{formData.status}</Badge>
              </InfoRow>
              <InfoRow label="Source" value={formData.source} />
              <InfoRow label="Expected Close" value={formData.expectedCloseDate?.toISOString().split("T")[0] ?? "—"} />
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-3">Financial</h2>
              <InfoRow label="Price" value={`${formData.price.toLocaleString()} ${formData.currency}`} />
              <InfoRow label="Total Paid" value={`${formData.totalPaid.toLocaleString()} ${formData.currency}`} />
              <InfoRow label="Outstanding" value={`${outstanding.toLocaleString()} ${formData.currency}`} />
              <InfoRow label="Notes" value={formData.notes} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-5 print:hidden">
        <CardContent className="py-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden md:table-cell">No.</TableHead>
                <TableHead>Amount Received</TableHead>
                <TableHead className="hidden md:table-cell">Currency</TableHead>
                <TableHead className="hidden md:table-cell">Method</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="hidden md:table-cell">Created By</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((item, index) => (
                <PaymentRow
                  key={item._id}
                  name={(index + 1).toString()}
                  state={new Date(item.date).toISOString().split("T")[0]}
                  totalSales={item.amount.toString()}
                  date={item.currency}
                  method={item.method}
                  price={item.createdBy?.name}
                  id={item._id}
                  handleDelete={(id) => mutation.mutate(id)}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="mt-5 print:hidden">
        <CardContent className="py-5">
          <Tabs defaultValue="timeline">
            <TabsList className="mb-4">
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="activities">Activities</TabsTrigger>
              <TabsTrigger value="finance">Finance</TabsTrigger>
            </TabsList>
            <TabsContent value="timeline">
              <RecordTimeline linkedTo={dealId!} linkedModel="Deal" />
            </TabsContent>
            <TabsContent value="notes">
              <NotesPanel linkedTo={dealId!} linkedModel="Deal" />
            </TabsContent>
            <TabsContent value="activities">
              <ActivityList linkedTo={dealId!} linkedModel="Deal" />
            </TabsContent>
            <TabsContent value="finance">
              <FinanceTab linkedModel="Deal" linkedId={dealId!} customerId={formData.customerID} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Invoice payments={payments} booking={formData} />
    </main>
  );
};

const InfoRow: React.FC<{ label: string; value?: string | number; children?: React.ReactNode }> = ({ label, value, children }) => (
  <div className="grid grid-cols-2 mb-2">
    <Label className="my-2">{label}</Label>
    {children ?? <p className="my-2">{value}</p>}
  </div>
);

export default ViewDeal;
