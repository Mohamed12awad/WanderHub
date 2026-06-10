import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle } from "lucide-react";
import { createActivity, getUsers } from "@/utils/api";
import { ActivityFormData, ActivityType } from "@/types/types";
import DynamicFields from "@/components/common/DynamicFields";

interface ActivityDialogProps {
  linkedTo: string;
  linkedModel: "Customer" | "Deal" | "Lead" | "Project" | "Supplier" | "PurchaseOrder" | "Invoice" | "Quote" | "SalesOrder";
  /** Render a full-width trigger (used in the narrow context panel). */
  fullWidth?: boolean;
}

const ACTIVITY_ICONS: Record<ActivityType, string> = {
  call: "📞",
  meeting: "🤝",
  task: "✅",
  note: "📝",
  email: "📧",
};

export const ActivityDialog: React.FC<ActivityDialogProps> = ({
  linkedTo,
  linkedModel,
  fullWidth = false,
}) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ActivityType>("call");
  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [customFields, setCustomFields] = useState<Record<string, string>>({});

  const { data: usersData } = useQuery({ queryKey: ["users-all"], queryFn: () => getUsers() });
  const users: { _id: string; name: string }[] = usersData?.data?.data ?? usersData?.data ?? [];

  const { mutate, isPending } = useMutation({
    mutationFn: createActivity,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["activities", linkedTo]
      });
      setOpen(false);
      setTitle("");
      setAssignedTo("");
      setType("call");
      setCustomFields({});
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: ActivityFormData = {
      type,
      title,
      date,
      status: "pending",
      linkedTo,
      linkedModel,
      ...(assignedTo ? { assignedTo } : {}),
      customFields,
    };
    mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className={`gap-1.5 shadow-sm ${fullWidth ? "w-full" : ""}`}>
          <PlusCircle className="h-4 w-4" />
          Log Activity
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Log Activity</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Type</Label>
              <div className="col-span-3">
                <Select
                  value={type}
                  onValueChange={(v) => setType(v as ActivityType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["call", "meeting", "task", "email"] as ActivityType[]).map(
                      (t) => (
                        <SelectItem key={t} value={t} className="capitalize">
                          {ACTIVITY_ICONS[t]} {t}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Title
              </Label>
              <Input
                id="title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="col-span-3"
                placeholder="e.g. Follow-up call with client"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                Date
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Assigned To</Label>
              <div className="col-span-3">
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user…" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <DynamicFields module="activities" values={customFields} onChange={(k, v) => setCustomFields((prev) => ({ ...prev, [k]: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
