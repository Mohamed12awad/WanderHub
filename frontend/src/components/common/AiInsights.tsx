import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Sparkles, Gauge, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { aiSummarize, aiScore } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";

type Props = {
  entity: "customers" | "deals" | "leads";
  id: string;
  /** Scoring only applies to leads & deals. */
  canScore?: boolean;
};

const RATING_COLOR: Record<string, string> = {
  hot: "text-red-600", warm: "text-amber-600", cold: "text-sky-600",
};

export function AiInsights({ entity, id, canScore }: Props) {
  const { tr } = useLanguage();
  const a = tr.tools.ai;
  const [summary, setSummary] = useState<string | null>(null);
  const [score, setScore] = useState<{ score: number | null; rating: string | null; rationale: string } | null>(null);

  const onErr = (e: any) =>
    toast({ title: a.error, description: e?.response?.data?.message ?? a.requestFailed, variant: "destructive" });

  const summarize = useMutation({ mutationFn: () => aiSummarize(entity, id), onSuccess: (r) => setSummary(r.data.summary), onError: onErr });
  const doScore = useMutation({ mutationFn: () => aiScore(entity, id), onSuccess: (r) => setScore(r.data), onError: onErr });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="gap-1.5" disabled={summarize.isPending} onClick={() => summarize.mutate()}>
          {summarize.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {a.summarize}
        </Button>
        {canScore && (
          <Button size="sm" variant="outline" className="gap-1.5" disabled={doScore.isPending} onClick={() => doScore.mutate()}>
            {doScore.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Gauge className="h-3.5 w-3.5" />}
            {a.score}
          </Button>
        )}
      </div>

      {score && (
        <div className="rounded-lg border border-border p-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums">{score.score ?? "—"}</span>
            <span className="text-sm text-muted-foreground">{a.of100}</span>
            {score.rating && <span className={`text-sm font-medium capitalize ${RATING_COLOR[score.rating] ?? ""}`}>{score.rating}</span>}
          </div>
          {score.rationale && <p className="text-sm text-muted-foreground mt-1">{score.rationale}</p>}
        </div>
      )}

      {summary && (
        <div className="rounded-lg border border-border p-3 text-sm whitespace-pre-wrap leading-relaxed">
          {summary}
        </div>
      )}

      {!summary && !score && (
        <p className="text-sm text-muted-foreground">{a.emptyHint(!!canScore)}</p>
      )}
    </div>
  );
}
