import { useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Users, Handshake, FileText, Receipt, ShoppingCart } from "lucide-react";
import {
  getCustomers, getDeals, getInvoices,
  getExpenses, getPurchaseOrders,
} from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";

function flattenObject(obj: unknown, prefix = ""): Record<string, string> {
  if (obj === null || obj === undefined) return {};
  if (typeof obj !== "object" || Array.isArray(obj)) {
    return { [prefix]: String(obj ?? "") };
  }
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      Object.assign(result, flattenObject(v, key));
    } else {
      result[key] = Array.isArray(v) ? v.join("; ") : String(v ?? "");
    }
  }
  return result;
}

function toCsv(rows: unknown[]): string {
  if (!rows.length) return "";
  const flat = rows.map((r) => flattenObject(r));
  const keys = [...new Set(flat.flatMap(Object.keys))];
  const header = keys.map((k) => `"${k}"`).join(",");
  const lines = flat.map((row) =>
    keys.map((k) => {
      const v = row[k] ?? "";
      return v.includes(",") || v.includes('"') || v.includes("\n")
        ? `"${v.replace(/"/g, '""')}"`
        : v;
    }).join(",")
  );
  return [header, ...lines].join("\n");
}

function downloadCsv(filename: string, csv: string) {
  if (!csv) return;
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function extractRows(res: unknown): unknown[] {
  const d = (res as any)?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(d?.data)) return d.data;
  return [];
}

interface ExportCard {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  filename: string;
  fetch: () => Promise<unknown>;
}

const EXPORTS: ExportCard[] = [
  {
    key: "contacts",
    label: "Contacts",
    description: "All customer/contact records including status, owner, and custom fields.",
    icon: Users,
    filename: "contacts.csv",
    fetch: () => getCustomers({ limit: 10000 }),
  },
  {
    key: "deals",
    label: "Deals",
    description: "All deals with stage, value, currency, and expected close date.",
    icon: Handshake,
    filename: "deals.csv",
    fetch: () => getDeals({ limit: 10000 }),
  },
  {
    key: "invoices",
    label: "Invoices",
    description: "All invoices with status, totals, and payment summary.",
    icon: FileText,
    filename: "invoices.csv",
    fetch: () => getInvoices(),
  },
  {
    key: "expenses",
    label: "Expenses",
    description: "All expense reports with amounts, categories, and approval status.",
    icon: Receipt,
    filename: "expenses.csv",
    fetch: () => getExpenses({ limit: 10000 }),
  },
  {
    key: "purchase-orders",
    label: "Purchase Orders",
    description: "All purchase orders with supplier, status, and totals.",
    icon: ShoppingCart,
    filename: "purchase-orders.csv",
    fetch: () => getPurchaseOrders({ limit: 10000 }),
  },
];

export default function DataExportSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const handleExport = async (entry: ExportCard) => {
    setLoading((p) => ({ ...p, [entry.key]: true }));
    try {
      const res = await entry.fetch();
      const rows = extractRows(res);
      if (!rows.length) {
        toast({ title: `No ${entry.label.toLowerCase()} to export.` });
        return;
      }
      downloadCsv(entry.filename, toCsv(rows));
      toast({ title: `${entry.label} exported — ${rows.length} rows.` });
    } catch {
      toast({ title: `Failed to export ${entry.label.toLowerCase()}.`, variant: "destructive" });
    } finally {
      setLoading((p) => ({ ...p, [entry.key]: false }));
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Data Export</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Download your data as CSV files. Files include a UTF-8 BOM for Excel compatibility.
        </p>
      </div>

      <div className="space-y-3">
        {EXPORTS.map((entry) => {
          const Icon = entry.icon;
          return (
            <Card key={entry.key}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <CardTitle className="text-sm font-semibold">{entry.label}</CardTitle>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 shrink-0"
                    disabled={loading[entry.key]}
                    onClick={() => handleExport(entry)}
                  >
                    <Download className="h-3.5 w-3.5" />
                    {loading[entry.key] ? "Exporting…" : "Export CSV"}
                  </Button>
                </div>
                <CardDescription className="text-xs">{entry.description}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
