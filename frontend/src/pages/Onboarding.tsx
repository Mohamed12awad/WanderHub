import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Rocket, Check, Building2, LayoutGrid, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageShell } from "@/components/common/PageShell";
import { useAuth } from "@/contexts/authContext";
import { useModules, MODULE_KEYS, type ModuleKey } from "@/contexts/ModulesContext";
import { getOrgSettings, updateOrgSettings, getGlConfig, updateGlConfig, markOnboarded } from "@/utils/api";
import { resolveHomeRoute } from "@/lib/resolveHomeRoute";
import { CURRENCIES } from "@/utils/constants";
import { useToast } from "@/components/ui/use-toast";

const LOCALES = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "ar-EG", label: "Arabic (Egypt)" },
  { value: "ar-SA", label: "Arabic (Saudi)" },
  { value: "fr-FR", label: "French" },
  { value: "de-DE", label: "German" },
];

const MODULE_LABELS: Record<ModuleKey, string> = {
  customers: "Contacts", leads: "Leads", deals: "Deals", pipeline: "Pipeline",
  calendar: "Calendar", tasks: "Tasks", products: "Products", expenses: "Expenses",
  quotes: "Quotes", invoices: "Invoices", salesOrders: "Sales Orders",
  suppliers: "Suppliers", purchaseOrders: "Purchase Orders", vendorBills: "Vendor Bills",
  reports: "Reports", projects: "Projects",
};

const STEPS = [
  { icon: Rocket, title: "Welcome" },
  { icon: LayoutGrid, title: "Modules" },
  { icon: Building2, title: "Workspace" },
  { icon: PartyPopper, title: "All set" },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, updateCurrentUser } = useAuth();
  const { modules, setModule } = useModules();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [currency, setCurrency] = useState("EGP");
  const [locale, setLocale] = useState("en-US");
  const [costMethod, setCostMethod] = useState("weighted_average");
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    getOrgSettings()
      .then((res) => {
        setCurrency(res.data?.baseCurrency ?? "EGP");
        setLocale(res.data?.locale ?? "en-US");
      })
      .catch(() => { /* keep defaults */ });
    getGlConfig()
      .then((res) => setCostMethod(res.data?.defaultCostMethod ?? "weighted_average"))
      .catch(() => { /* keep default */ });
  }, []);

  const finish = async () => {
    setFinishing(true);
    try {
      await markOnboarded();
      updateCurrentUser({ hasOnboarded: true });
    } catch {
      toast({ title: "Couldn't save onboarding state — continuing anyway.", variant: "destructive" });
    } finally {
      navigate(resolveHomeRoute(user), { replace: true });
    }
  };

  const saveWorkspace = async () => {
    try { await updateOrgSettings({ baseCurrency: currency, locale }); }
    catch { /* non-blocking */ }
    if (modules.products) {
      try { await updateGlConfig({ defaultCostMethod: costMethod }); }
      catch { /* non-blocking */ }
    }
  };

  const next = async () => {
    if (step === 2) await saveWorkspace();
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  return (
    <PageShell width="narrow">
      {/* Stepper */}
      <div className="flex items-center justify-center gap-2">
        {STEPS.map((s, i) => {
          const done = i < step;
          const active = i === step;
          const Icon = s.icon;
          return (
            <div key={s.title} className="flex items-center gap-2">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${
                  done ? "bg-primary border-primary text-primary-foreground"
                  : active ? "border-primary text-primary"
                  : "border-border text-muted-foreground"
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              {i < STEPS.length - 1 && (
                <span className={`h-px w-6 ${i < step ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          );
        })}
      </div>

      <Card>
        <CardContent className="py-8 px-6">
          {/* Step 0 — Welcome */}
          {step === 0 && (
            <div className="flex flex-col items-center text-center gap-4">
              <div className="rounded-2xl bg-primary/10 p-4"><Rocket className="h-7 w-7 text-primary" /></div>
              <div>
                <h2 className="text-lg font-semibold">Welcome to NawaHub{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!</h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  Let's set up your workspace in a couple of quick steps. You can change any of
                  this later in Settings.
                </p>
              </div>
            </div>
          )}

          {/* Step 2 — Workspace basics */}
          {step === 2 && (
            <div className="space-y-5 max-w-sm mx-auto">
              <div className="text-center">
                <h2 className="text-lg font-semibold">Workspace basics</h2>
                <p className="text-sm text-muted-foreground mt-1">Your base currency and regional formatting.</p>
              </div>
              <div className="grid gap-1.5">
                <Label>Base currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Display locale</Label>
                <Select value={locale} onValueChange={setLocale}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LOCALES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {modules.products && (
                <div className="grid gap-1.5">
                  <Label>Inventory costing method</Label>
                  <Select value={costMethod} onValueChange={setCostMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weighted_average">Weighted Average</SelectItem>
                      <SelectItem value="fifo">FIFO</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    How stock is valued. You can change this later, but it's harder once you have inventory movements.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 1 — Modules */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-lg font-semibold">Choose your modules</h2>
                <p className="text-sm text-muted-foreground mt-1">Turn off anything you don't need — toggle it back anytime in Settings.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {MODULE_KEYS.map((k) => (
                  <label key={k} className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2.5 cursor-pointer">
                    <span className="text-sm font-medium">{MODULE_LABELS[k]}</span>
                    <Switch checked={modules[k]} onCheckedChange={(v) => setModule(k, v)} />
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 — Done */}
          {step === 3 && (
            <div className="flex flex-col items-center text-center gap-4">
              <div className="rounded-2xl bg-emerald-500/10 p-4"><PartyPopper className="h-7 w-7 text-emerald-500" /></div>
              <div>
                <h2 className="text-lg font-semibold">You're all set!</h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  Your workspace is ready. Jump in and start adding your contacts, deals, and invoices.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={finish} disabled={finishing}>
          Skip for now
        </Button>
        <div className="flex items-center gap-2">
          {step > 0 && step < STEPS.length - 1 && (
            <Button variant="outline" onClick={() => setStep((s) => Math.max(s - 1, 0))} disabled={finishing}>
              Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button onClick={next} disabled={finishing}>Continue</Button>
          ) : (
            <Button onClick={finish} disabled={finishing}>{finishing ? "Finishing…" : "Go to my workspace"}</Button>
          )}
        </div>
      </div>
    </PageShell>
  );
}
