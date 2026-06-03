import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getNumberSequences, updateNumberSequence } from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";

interface NumberSequence {
  id: string;
  key: string;
  prefix: string;
  lastNumber: number;
  padLength: number;
  separator: string;
}

const DOC_LABELS: Record<string, string> = {
  invoice: "Invoice",
  quote:   "Quote",
  po:      "Purchase Order",
  bill:    "Vendor Bill",
  expense: "Expense Report",
};

const DOC_KEYS = ["invoice", "quote", "po", "bill", "expense"];

// Radix Select forbids value="". Use a sentinel for the "no separator" option.
const SEP_NONE = "__none__";

const SEPARATORS = [
  { value: "-",       label: "Hyphen  ( - )" },
  { value: "/",       label: "Slash   ( / )" },
  { value: ".",       label: "Dot     ( . )" },
  { value: SEP_NONE,  label: "None" },
];

const toSelectVal  = (sep: string) => sep === "" ? SEP_NONE : sep;
const fromSelectVal = (val: string) => val === SEP_NONE ? "" : val;

function makePreview(prefix: string, padLength: number, separator: string, lastNumber: number) {
  const next = String(lastNumber + 1).padStart(padLength, "0");
  return prefix ? `${prefix}${separator}${next}` : next;
}

function SequenceRow({ seq, onSaved }: { seq: NumberSequence; onSaved: () => void }) {
  const { toast } = useToast();
  const [prefix, setPrefix] = useState(seq.prefix);
  const [padLength, setPadLength] = useState(seq.padLength);
  const [separator, setSeparator] = useState(toSelectVal(seq.separator));
  const [saving, setSaving] = useState(false);

  const isDirty = prefix !== seq.prefix || padLength !== seq.padLength || fromSelectVal(separator) !== seq.separator;

  const current = makePreview(seq.prefix, seq.padLength, seq.separator, seq.lastNumber);
  const preview = makePreview(prefix, padLength, fromSelectVal(separator), seq.lastNumber);

  const save = async () => {
    setSaving(true);
    try {
      await updateNumberSequence(seq.key, { prefix, padLength, separator: fromSelectVal(separator) });
      toast({ title: `${DOC_LABELS[seq.key] ?? seq.key} sequence updated.` });
      onSaved();
    } catch {
      toast({ title: "Failed to save.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 py-3 px-4 border-b last:border-0">
      {/* Doc label + current / preview */}
      <div className="w-36 shrink-0 space-y-1">
        <p className="text-sm font-medium">{DOC_LABELS[seq.key] ?? seq.key}</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Now</span>
          <span className={`text-xs font-mono ${isDirty ? "text-muted-foreground line-through" : "text-foreground"}`}>
            {current}
          </span>
        </div>
        {isDirty && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-primary uppercase tracking-wide">After</span>
            <span className="text-xs font-mono text-primary font-semibold">{preview}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 flex-1">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Prefix</span>
          <Input
            value={prefix}
            onChange={(e) => setPrefix(e.target.value.toUpperCase())}
            placeholder="e.g. INV"
            className="h-7 w-24 text-xs font-mono"
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Separator</span>
          <Select value={separator} onValueChange={setSeparator}>
            <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SEPARATORS.map((s) => (
                <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Padding</span>
          <Input
            type="number"
            min={2}
            max={8}
            value={padLength}
            onChange={(e) => setPadLength(Math.max(2, Math.min(8, parseInt(e.target.value) || 4)))}
            className="h-7 w-16 text-xs"
          />
        </div>

        {isDirty && (
          <Button size="sm" className="h-7 text-xs mt-4" disabled={saving} onClick={save}>
            {saving ? "Saving…" : "Save"}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function NumberSequencesSettings() {
  const { toast } = useToast();
  const [sequences, setSequences] = useState<NumberSequence[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getNumberSequences()
      .then((res) => {
        const data: NumberSequence[] = res.data ?? [];
        // Ensure all 5 doc types are present even if backend hasn't seeded them yet
        const merged = DOC_KEYS.map((key) => {
          const existing = data.find((s) => s.key === key);
          return existing ?? { id: key, key, prefix: "", lastNumber: 0, padLength: 4, separator: "-" };
        });
        setSequences(merged);
      })
      .catch(() => toast({ title: "Failed to load sequences.", variant: "destructive" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Number Sequences</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure the prefix, separator, and padding for auto-generated document numbers.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-semibold">Document Numbering</CardTitle>
          <CardDescription className="text-xs">
            The preview shows the next number that will be assigned. Changing a prefix or separator takes effect on the next document created.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 mt-3">
          <div className="divide-y">
            {sequences.map((seq) => (
              <SequenceRow key={seq.key} seq={seq} onSaved={load} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
