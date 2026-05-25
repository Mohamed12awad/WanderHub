import React from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onConfirm,
  onCancel,
  title,
  description,
}) => {
  const { tr } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            {title ?? tr.confirmDialog.title}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {description ?? tr.confirmDialog.description}
        </p>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel}>
            {tr.confirmDialog.cancel}
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {tr.confirmDialog.delete}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
