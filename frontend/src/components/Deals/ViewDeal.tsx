import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDealById } from "@/utils/api";
import { Link, useParams } from "react-router-dom";
import { CircleArrowLeft, Edit, Printer, FileText } from "lucide-react";
import { useQuery } from "react-query";
import { DealPaymentDialog } from "./DealPaymentDialog";
import { Button } from "../ui/button";
import LoadingSpinner from "../common/spinner";
import { ActivityList } from "@/components/Activities/ActivityList";
import { RecordTimeline } from "@/components/common/RecordTimeline";
import { NotesPanel } from "@/components/common/NotesPanel";
import FinanceTab from "@/components/Finance/FinanceTab";

const STATUS_COLORS: Record<string, string> = {
  lead: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  qualified: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  proposal: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  negotiation: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  won: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  lost: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  cancelled: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
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


const ViewDeal = () => {
  const { id: dealId } = useParams<{ id: string }>();

  const { data: dealData, isLoading, error } = useQuery(
    ["deals", dealId],
    () => getDealById(dealId!)
  );

  const [formData, setFormData] = useState<DealData | null>(null);

  useEffect(() => {
    if (!dealData?.data) return;
    const d = dealData.data.deal;
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
          <div className="flex gap-2 flex-wrap">
            <Link to={`/finance/quotes/new?deal=${dealId}&customer=${formData.customerID}`}>
              <Button size="sm" variant="outline" className="h-8 px-4">
                <FileText className="h-3.5 w-3.5 me-1" />New Quote
              </Button>
            </Link>
            <Link to={`/deals/${dealId}/edit`}>
              <Button size="sm" className="h-8 px-4">
                <Edit className="h-3.5 w-3.5 me-1" />Edit
              </Button>
            </Link>
            <DealPaymentDialog
              dealId={dealId!}
              customerId={formData.customerID}
              dealTitle={formData.title}
              dealPrice={formData.price}
              currency={formData.currency}
            />
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
