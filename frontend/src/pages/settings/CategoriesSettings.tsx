import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { getWorkspaceSettings, updateWorkspaceSettings } from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function CategoriesSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [categories, setCategories] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rawFieldGroups, setRawFieldGroups] = useState<unknown[]>([]);

  useEffect(() => {
    getWorkspaceSettings()
      .then((res) => {
        const groups: { module: string; fields: { name: string; options?: string }[] }[] =
          res.data?.fieldGroups ?? [];
        setRawFieldGroups(groups as unknown[]);
        const expensesGroup = groups.find((g) => g.module === "expenses");
        const categoryField = expensesGroup?.fields.find((f) => f.name === "category");
        const opts = categoryField?.options ?? "marketing,transportation,utilities,meals,lodging,travel,supplies,others";
        setCategories(opts.split(",").map((s) => s.trim()).filter(Boolean));
      })
      .catch(() => toast({ title: "Failed to load categories.", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [toast]);

  const persist = async (cats: string[]) => {
    setSaving(true);
    try {
      const groups = (rawFieldGroups as { module: string; fields: { name: string; options?: string; [k: string]: unknown }[] }[]).map((g) => {
        if (g.module !== "expenses") return g;
        return {
          ...g,
          fields: g.fields.map((f) =>
            f.name === "category" ? { ...f, options: cats.join(",") } : f
          ),
        };
      });
      await updateWorkspaceSettings({ fieldGroups: groups as any });
      queryClient.invalidateQueries({ queryKey: ["workspaceSettings"] });
      toast({ title: "Categories saved." });
    } catch {
      toast({ title: "Failed to save.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const addCategory = () => {
    const val = input.trim().toLowerCase().replace(/\s+/g, "_");
    if (!val || categories.includes(val)) { setInput(""); return; }
    const updated = [...categories, val];
    setCategories(updated);
    setInput("");
    persist(updated);
  };

  const removeCategory = (cat: string) => {
    const updated = categories.filter((c) => c !== cat);
    setCategories(updated);
    persist(updated);
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="page-w-narrow page-pad page-gap">
      <div>
        <h2 className="text-lg font-semibold">Expense Categories</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Define the categories available when logging expense items.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Categories</CardTitle>
          <CardDescription className="text-xs">
            Click a badge to remove it. Press Enter or click + to add a new one.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-1.5 min-h-8">
            {categories.map((cat) => (
              <Badge
                key={cat}
                variant="secondary"
                className="gap-1 pr-1 cursor-default capitalize"
              >
                {cat.replace(/_/g, " ")}
                <button
                  onClick={() => removeCategory(cat)}
                  disabled={saving}
                  className="hover:text-destructive transition-colors rounded-full"
                  aria-label={`Remove ${cat}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {categories.length === 0 && (
              <p className="text-sm text-muted-foreground">No categories yet.</p>
            )}
          </div>

          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCategory(); } }}
              placeholder="Add category…"
              className="h-8 text-sm flex-1 max-w-xs"
              disabled={saving}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1"
              onClick={addCategory}
              disabled={!input.trim() || saving}
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
