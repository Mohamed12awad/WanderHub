import { Link } from "react-router-dom";
import { Rocket } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const STEPS = [
  { step: 1, label: "Add your first contact", href: "/customers/add", cta: "Add Contact" },
  { step: 2, label: "Create a deal", href: "/deals/add", cta: "Create Deal" },
  { step: 3, label: "Send a quote or invoice", href: "/finance/quotes/new", cta: "New Quote" },
];

/**
 * Empty-workspace "get started" checklist. Extracted from the Dashboard so it can
 * be reused; shown until the workspace has real data (see Dashboard's onboarding
 * heuristic) or the user has finished the first-run flow.
 */
export function GettingStartedCard() {
  return (
    <Card className="border-dashed border-2 shadow-none bg-muted/20">
      <CardContent className="py-10">
        <div className="flex flex-col items-center text-center gap-5 max-w-md mx-auto">
          <div className="rounded-2xl bg-primary/10 p-4">
            <Rocket className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-1.5">Get started with your workspace</h2>
            <p className="text-sm text-muted-foreground">Complete these steps to set up your CRM.</p>
          </div>
          <div className="w-full space-y-2.5 text-left">
            {STEPS.map(({ step, label, href, cta }) => (
              <div key={step} className="flex items-center justify-between gap-4 rounded-lg border bg-card px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
                    {step}
                  </span>
                  <span className="text-sm font-medium">{label}</span>
                </div>
                <Link to={href}>
                  <Button size="sm" variant="outline" className="h-7 text-xs px-3 shrink-0">{cta}</Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
