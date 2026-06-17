import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getOrgSettings, updateOrgSettings } from "@/utils/api";
import { toast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useOrgLogo } from "@/hooks/useOrgLogo";
import { Upload, X } from "lucide-react";

const CURRENCIES = [
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "EGP", label: "EGP — Egyptian Pound" },
  { value: "AED", label: "AED — UAE Dirham" },
  { value: "SAR", label: "SAR — Saudi Riyal" },
  { value: "JPY", label: "JPY — Japanese Yen" },
  { value: "CNY", label: "CNY — Chinese Yuan" },
  { value: "INR", label: "INR — Indian Rupee" },
];

const LOCALES = [
  { value: "en-US", label: "English (US) — 1,234.56 · Jan 1, 2024" },
  { value: "en-GB", label: "English (UK) — 1,234.56 · 1 Jan 2024" },
  { value: "ar-EG", label: "Arabic (Egypt) — ١٬٢٣٤٫٥٦ · ١ يناير ٢٠٢٤" },
  { value: "ar-SA", label: "Arabic (Saudi) — ١٬٢٣٤٫٥٦ · ١ يناير ٢٠٢٤" },
  { value: "de-DE", label: "German — 1.234,56 · 1. Jan. 2024" },
  { value: "fr-FR", label: "French — 1 234,56 · 1 janv. 2024" },
  { value: "es-ES", label: "Spanish — 1.234,56 · 1 ene 2024" },
  { value: "ja-JP", label: "Japanese — 1,234.56 · 2024年1月1日" },
  { value: "zh-CN", label: "Chinese (Simplified) — 1,234.56 · 2024年1月1日" },
];

export default function OrganizationSettings() {
  const queryClient = useQueryClient();
  const [baseCurrency, setBaseCurrency] = useState("EGP");
  const [locale, setLocale] = useState("en-US");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { logo, setLogo } = useOrgLogo();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 200 * 1024) { toast({ title: "Logo must be under 200 KB.", variant: "destructive" }); return; }
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result as string);
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    getOrgSettings()
      .then((res) => {
        setBaseCurrency(res.data.baseCurrency ?? "USD");
        setLocale(res.data.locale ?? "en-US");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateOrgSettings({ baseCurrency, locale });
      queryClient.invalidateQueries({
        queryKey: ["orgSettings"]
      });
      toast({ title: "Organization settings saved." });
    } catch {
      toast({ title: "Failed to save settings.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const preview = {
    number: (1234567.89).toLocaleString(locale, { minimumFractionDigits: 2 }),
    date: new Date(2024, 0, 15).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" }),
    currency: (1234.5).toLocaleString(locale, { style: "currency", currency: baseCurrency }),
  };

  return (
    <div className="page-w-narrow page-pad page-gap">
      <div>
        <h2 className="text-base font-semibold">Organization</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Set the workspace logo, base currency, and regional formatting.
        </p>
      </div>

      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Workspace Logo</CardTitle>
          <CardDescription className="text-xs">
            Shown in the sidebar and login screen. PNG or SVG recommended, max 200 KB.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl border bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {logo
                ? <img src={logo} alt="Logo" className="h-full w-full object-contain p-1" />
                : <span className="text-xl font-bold text-muted-foreground">N</span>}
            </div>
            <div className="flex gap-2">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-3.5 w-3.5" />Upload
              </Button>
              {logo && (
                <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-destructive hover:text-destructive" onClick={() => setLogo(null)}>
                  <X className="h-3.5 w-3.5" />Remove
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Currency</CardTitle>
          <CardDescription className="text-xs">
            The base currency used for invoices and exchange rate calculations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-9 w-60" />
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Base Currency</Label>
              <Select value={baseCurrency} onValueChange={setBaseCurrency}>
                <SelectTrigger className="w-60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Locale &amp; Formatting</CardTitle>
          <CardDescription className="text-xs">
            Controls how dates, numbers, and currency amounts are displayed throughout the app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <Skeleton className="h-9 w-72" />
          ) : (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Display Locale</Label>
                <Select value={locale} onValueChange={setLocale}>
                  <SelectTrigger className="w-72">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCALES.map((l) => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Preview</p>
                <div className="grid grid-cols-[100px_1fr] gap-1 text-xs">
                  <span className="text-muted-foreground">Number</span>
                  <span className="font-mono">{preview.number}</span>
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-mono">{preview.date}</span>
                  <span className="text-muted-foreground">Currency</span>
                  <span className="font-mono">{preview.currency}</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || loading} size="sm">
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
