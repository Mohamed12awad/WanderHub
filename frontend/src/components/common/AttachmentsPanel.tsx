import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Paperclip, Upload, Download, Trash2 } from "lucide-react";
import {
  getAttachments, uploadAttachment, downloadAttachment, deleteAttachment,
} from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";

interface Attachment {
  _id: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function AttachmentsPanel({ linkedModel, linkedToId }: { linkedModel: string; linkedToId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const key = ["attachments", linkedModel, linkedToId];
  const { data } = useQuery({
    queryKey: key,
    queryFn: () => getAttachments(linkedModel, linkedToId),
    enabled: !!linkedToId,
  });
  const files: Attachment[] = data?.data ?? [];

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadAttachment(file, linkedModel, linkedToId);
      toast({ title: "File uploaded." });
      queryClient.invalidateQueries({ queryKey: key });
    } catch (err: any) {
      toast({ title: err?.response?.data?.message ?? "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDownload = async (att: Attachment) => {
    try {
      const res = await downloadAttachment(att._id);
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = att.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    }
  };

  const handleDelete = async (att: Attachment) => {
    if (!confirm(`Delete "${att.filename}"?`)) return;
    try {
      await deleteAttachment(att._id);
      toast({ title: "Attachment deleted." });
      queryClient.invalidateQueries({ queryKey: key });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  return (
    <Card className="shadow-sm border-border/60">
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          Attachments
        </CardTitle>
        <Button size="sm" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
          <Upload className="h-3.5 w-3.5 me-1" />{uploading ? "Uploading…" : "Upload"}
        </Button>
        <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
      </CardHeader>
      <CardContent>
        {files.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No files attached.</p>
        ) : (
          <ul className="divide-y">
            {files.map((att) => (
              <li key={att._id} className="flex items-center justify-between py-2 gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{att.filename}</p>
                  <p className="text-[11px] text-muted-foreground">{humanSize(att.size)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Download" onClick={() => handleDownload(att)}>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Delete" onClick={() => handleDelete(att)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default AttachmentsPanel;
