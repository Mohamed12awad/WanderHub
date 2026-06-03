import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import { updateWorkspaceSettings, updateOrgSettings } from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const CONFIRM_PHRASE = "RESET";

interface DangerActionProps {
  title: string;
  description: string;
  buttonLabel: string;
  onConfirm: () => Promise<void>;
}

function DangerAction({ title, description, buttonLabel, onConfirm }: DangerActionProps) {
  const { toast } = useToast();
  const [phrase, setPhrase] = useState("");
  const [running, setRunning] = useState(false);

  const handle = async () => {
    if (phrase !== CONFIRM_PHRASE) return;
    setRunning(true);
    try {
      await onConfirm();
      toast({ title: "Done." });
      setPhrase("");
    } catch {
      toast({ title: "Action failed.", variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="flex items-end gap-2">
        <div className="grid gap-1 flex-1 max-w-xs">
          <Label className="text-xs text-muted-foreground">
            Type <span className="font-mono font-semibold">{CONFIRM_PHRASE}</span> to confirm
          </Label>
          <Input
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder={CONFIRM_PHRASE}
            className="h-8 text-sm"
          />
        </div>
        <Button
          variant="destructive"
          size="sm"
          className="h-8"
          disabled={phrase !== CONFIRM_PHRASE || running}
          onClick={handle}
        >
          {running ? "Running…" : buttonLabel}
        </Button>
      </div>
    </div>
  );
}

export default function DangerZoneSettings() {
  const queryClient = useQueryClient();

  const resetWorkspace = async () => {
    await updateWorkspaceSettings({ fieldGroups: [], moduleSettings: [] });
    queryClient.invalidateQueries({ queryKey: ["workspaceSettings"] });
  };

  const resetOrganization = async () => {
    await updateOrgSettings({ baseCurrency: "USD", locale: "en-US" });
    queryClient.invalidateQueries({ queryKey: ["orgSettings"] });
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Danger Zone</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Irreversible actions. These cannot be undone.
        </p>
      </div>

      <Card className="border-destructive/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <CardTitle className="text-sm font-semibold text-destructive">Destructive Actions</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Read each action carefully before confirming. All changes are immediate and permanent.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <DangerAction
            title="Reset Custom Fields & Module Settings"
            description="Removes all custom field definitions and resets module visibility to defaults. System fields are unaffected."
            buttonLabel="Reset Workspace"
            onConfirm={resetWorkspace}
          />
          <div className="border-t" />
          <DangerAction
            title="Reset Organization Settings"
            description="Reverts the base currency to USD and the display locale to English (US)."
            buttonLabel="Reset Organization"
            onConfirm={resetOrganization}
          />
        </CardContent>
      </Card>
    </div>
  );
}
