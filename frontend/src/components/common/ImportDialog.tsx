import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Upload, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { getImportFields, importRecords, type ImportField, type ImportResult } from "@/utils/api";
import { parseCSV } from "@/utils/csv";
import { useLanguage } from "@/contexts/LanguageContext";

const SKIP = "__skip__";
const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

type Props = {
  entity: string;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after at least one record is created, to refresh the list. */
  onDone?: () => void;
};

export function ImportDialog({ entity, title, open, onOpenChange, onDone }: Props) {
  const { tr } = useLanguage();
  const t = tr.tools.import;
  const [step, setStep] = useState<"upload" | "preview" | "map" | "result">("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: fieldsResp } = useQuery({
    queryKey: ["import-fields", entity],
    queryFn: () => getImportFields(entity),
    enabled: open,
  });
  const fields: ImportField[] = useMemo(() => fieldsResp?.data.fields ?? [], [fieldsResp]);

  // Fresh state every time the dialog opens.
  useEffect(() => {
    if (open) { setStep("upload"); setHeaders([]); setRows([]); setMapping({}); setResult(null); }
  }, [open]);

  const autoMap = (hdrs: string[], flds: ImportField[]) => {
    const map: Record<string, string> = {};
    for (const f of flds) {
      const hit = hdrs.find((h) => normalize(h) === normalize(f.label) || normalize(h) === normalize(f.key));
      if (hit) map[f.key] = hit;
    }
    return map;
  };

  // If fields finish loading after a file was picked, auto-map once.
  useEffect(() => {
    if (fields.length && headers.length && Object.keys(mapping).length === 0) {
      setMapping(autoMap(headers, fields));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, headers]);

  const handleFile = async (file: File) => {
    try {
      const { headers: hdrs, rows: parsed } = parseCSV(await file.text());
      if (!hdrs.length || !parsed.length) {
        toast({ title: t.emptyFile, description: t.emptyFileDesc, variant: "destructive" });
        return;
      }
      setHeaders(hdrs);
      setRows(parsed);
      setMapping(autoMap(hdrs, fields));
      setStep("preview");
    } catch {
      toast({ title: t.readError, variant: "destructive" });
    }
  };

  const missingRequired = useMemo(
    () => fields.filter((f) => f.required && !mapping[f.key]).map((f) => f.label),
    [fields, mapping],
  );

  const mutation = useMutation({
    mutationFn: () => importRecords(entity, { mapping, rows }),
    onSuccess: (resp) => {
      setResult(resp.data);
      setStep("result");
      if (resp.data.created > 0) onDone?.();
    },
    onError: (e: any) => {
      toast({
        title: t.importFailed,
        description: e?.response?.data?.message ?? t.somethingWrong,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t.title(title)}</DialogTitle>
          <DialogDescription>
            {step === "upload" && t.descUpload}
            {step === "preview" && t.descPreview(rows.length)}
            {step === "map" && t.descMap}
            {step === "result" && t.descResult}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div
            className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border py-12 cursor-pointer hover:bg-muted/40 transition-colors"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t.dropHint}</p>
            <input
              ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
            />
          </div>
        )}

        {step === "preview" && (
          <div className="overflow-auto max-h-[50vh] rounded-md border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  {headers.map((h) => (
                    <th key={h} className="px-2 py-1.5 text-start font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((r, i) => (
                  <tr key={i} className="border-t border-border/60">
                    {headers.map((h) => (
                      <td key={h} className="px-2 py-1.5 whitespace-nowrap max-w-[200px] truncate text-muted-foreground">{r[h]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {step === "map" && (
          <div className="max-h-[50vh] overflow-y-auto space-y-2 pe-1">
            {fields.map((f) => (
              <div key={f.key} className="grid grid-cols-2 items-center gap-3">
                <div className="text-sm">
                  <span className="font-medium">{f.label}</span>
                  {f.required && <span className="text-destructive"> *</span>}
                  {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
                </div>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={mapping[f.key] ?? SKIP}
                  onChange={(e) => setMapping((m) => {
                    const next = { ...m };
                    if (e.target.value === SKIP) delete next[f.key];
                    else next[f.key] = e.target.value;
                    return next;
                  })}
                >
                  <option value={SKIP}>{t.dontImport}</option>
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}

        {step === "result" && result && (
          <div className="space-y-3">
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="font-medium">{result.created}</span> {t.created}
              </div>
              {result.skipped > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="font-medium">{result.skipped}</span> {t.skipped}
                </div>
              )}
            </div>
            {result.errors.length > 0 && (
              <div className="max-h-[40vh] overflow-y-auto rounded-md border border-border text-sm">
                {result.errors.map((err, i) => (
                  <div key={i} className="flex gap-2 border-b border-border/60 px-3 py-1.5 last:border-0">
                    <span className="text-muted-foreground shrink-0">{t.rowLabel(err.row)}</span>
                    <span className="text-destructive">{err.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>{t.back}</Button>
              <Button onClick={() => setStep("map")}>{t.continue}</Button>
            </>
          )}
          {step === "map" && (
            <>
              <Button variant="outline" onClick={() => setStep("preview")}>{t.back}</Button>
              <Button onClick={() => mutation.mutate()} disabled={missingRequired.length > 0 || mutation.isPending}>
                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                {missingRequired.length > 0
                  ? t.mapRequired(missingRequired.join(", "))
                  : t.importN(rows.length)}
              </Button>
            </>
          )}
          {step === "result" && <Button onClick={() => onOpenChange(false)}>{t.done}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
