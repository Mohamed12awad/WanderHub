import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, Eye, MousePointerClick, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { getEmails, sendEmail } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";

type Props = {
  linkedTo: string;
  linkedModel: "Customer" | "Deal" | "Lead";
  defaultTo?: string;
};

export function EmailsPanel({ linkedTo, linkedModel, defaultTo }: Props) {
  const { tr, formatDate } = useLanguage();
  const em = tr.tools.emails;
  const qc = useQueryClient();
  const key = ["emails", linkedModel, linkedTo];
  const { data, isPending } = useQuery({ queryKey: key, queryFn: () => getEmails(linkedTo, linkedModel) });
  const emails = data?.data ?? [];

  const [to, setTo] = useState(defaultTo ?? "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const send = useMutation({
    mutationFn: () => sendEmail({ to, subject, body, linkedToId: linkedTo, linkedModel }),
    onSuccess: () => {
      toast({ title: em.queued });
      setSubject(""); setBody("");
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e: any) => toast({ title: em.sendFailed, description: e?.response?.data?.message ?? "", variant: "destructive" }),
  });

  const canSend = to.trim() && subject.trim() && body.trim();

  return (
    <div className="space-y-4">
      {/* Compose */}
      <div className="rounded-lg border border-border p-3 space-y-2">
        <Input placeholder={em.to} value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
        <Input placeholder={em.subject} value={subject} onChange={(e) => setSubject(e.target.value)} className="h-9" />
        <textarea
          placeholder={em.message} value={body} onChange={(e) => setBody(e.target.value)}
          className="w-full min-h-[100px] rounded-md border border-input bg-background p-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex justify-end">
          <Button size="sm" disabled={!canSend || send.isPending} onClick={() => send.mutate()} className="gap-1.5">
            {send.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {em.send}
          </Button>
        </div>
      </div>

      {/* Tracked emails */}
      {isPending ? (
        <div className="py-8 text-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline" /></div>
      ) : emails.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
          <Mail className="h-6 w-6 opacity-40" /> {em.none}
        </div>
      ) : (
        <div className="space-y-2">
          {emails.map((e) => (
            <div key={e.id} className="rounded-md border border-border/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm truncate">{e.subject}</span>
                <span className="text-[11px] text-muted-foreground shrink-0">{formatDate(e.createdAt, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{em.toAddr(e.to)} · {e.deliveryStatus ?? e.status}</div>
              <div className="flex items-center gap-3 mt-1.5 text-xs">
                <span className={`inline-flex items-center gap-1 ${e.openCount > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
                  <Eye className="h-3.5 w-3.5" /> {em.opens(e.openCount)}
                </span>
                <span className={`inline-flex items-center gap-1 ${e.clickCount > 0 ? "text-sky-600" : "text-muted-foreground"}`}>
                  <MousePointerClick className="h-3.5 w-3.5" /> {em.clicks(e.clickCount)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
