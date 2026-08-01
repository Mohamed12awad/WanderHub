import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getNotes, createNote, updateNote, deleteNote } from "@/utils/api";
import { useAuth } from "@/contexts/authContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Note, NoteLinkedModel } from "@/types/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  linkedTo: string;
  linkedModel: NoteLinkedModel;
}

export function NotesPanel({ linkedTo, linkedModel }: Props) {
  const { user } = useAuth();
  const { tr, formatDate } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const t = tr.notes;

  const [draft, setDraft] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);

  const qKey = ["notes", linkedTo, linkedModel];

  const { data, isPending } = useQuery({
    queryKey: qKey,

    queryFn: () =>
      getNotes({ linkedTo, linkedModel }),

    enabled: !!linkedTo
  });
  const notes: Note[] = data?.data ?? [];

  const isAdminOrOwner = (note: Note) =>
    note.createdBy._id === user?._id ||
    (user?.permissions ?? []).some((p) => p === '*' || p === 'notes:edit');

  const createMut = useMutation({
    mutationFn: () => createNote({ content: draft.trim(), linkedTo, linkedModel }),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: qKey
      });
      queryClient.invalidateQueries({
        queryKey: ["timeline", linkedTo, linkedModel]
      });
      setDraft("");
      toast({ title: "Note added." });
    }
  });

  const updateMut = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => updateNote(id, content),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: qKey
      });
      setEditId(null);
      toast({ title: "Note updated." });
    }
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteNote(id),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: qKey
      });
      toast({ title: "Note deleted." });
    }
  });

  const startEdit = (note: Note) => {
    setEditId(note._id);
    setEditContent(note.content);
  };

  const cancelEdit = () => { setEditId(null); setEditContent(""); };

  const saveEdit = () => {
    if (!editContent.trim() || !editId) return;
    updateMut.mutate({ id: editId, content: editContent.trim() });
  };

  // auto-resize textarea
  const autoResize = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => { autoResize(textareaRef.current); }, [draft]);
  useEffect(() => { autoResize(editRef.current); }, [editContent]);

  return (
    <div className="space-y-4">
      {/* Compose */}
      <div className="rounded-lg border bg-card p-3 space-y-2">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.ctrlKey && draft.trim()) {
              e.preventDefault();
              createMut.mutate();
            }
          }}
          placeholder={t.placeholder}
          rows={2}
          className="w-full resize-none bg-transparent text-sm focus:outline-none min-h-[3rem]"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Ctrl+Enter to submit</p>
          <Button
            size="sm"
            disabled={!draft.trim() || createMut.isPending}
            onClick={() => createMut.mutate()}
          >
            {createMut.isPending ? t.saving : t.add}
          </Button>
        </div>
      </div>
      {/* List */}
      {isPending && (
        <p className="text-sm text-muted-foreground text-center py-4">Loading…</p>
      )}
      {!isPending && notes.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6 border rounded-lg">
          {t.empty}
        </p>
      )}
      <ul className="space-y-2">
        {notes.map((note) => (
          <li key={note._id} className="group rounded-lg border bg-card p-3">
            {editId === note._id ? (
              <div className="space-y-2">
                <textarea
                  ref={editRef}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") cancelEdit();
                    if (e.key === "Enter" && e.ctrlKey) saveEdit();
                  }}
                  rows={3}
                  autoFocus
                  className="w-full resize-none bg-transparent text-sm border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring min-h-[4rem]"
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={cancelEdit}>
                    <X className="h-3.5 w-3.5 me-1" />{t.cancel}
                  </Button>
                  <Button
                    size="sm"
                    disabled={!editContent.trim() || updateMut.isPending}
                    onClick={saveEdit}
                  >
                    <Check className="h-3.5 w-3.5 me-1" />
                    {updateMut.isPending ? t.saving : t.save}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{note.content}</p>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    <span className="font-medium">{note.createdBy.name}</span>
                    {" · "}
                    <span title={formatDate(note.createdAt, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}>
                      {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                    </span>
                    {note.updatedAt !== note.createdAt && " · edited"}
                  </p>
                </div>

                {isAdminOrOwner(note) && (
                  <div className={cn(
                    "flex gap-0.5 shrink-0 transition-opacity",
                    "opacity-0 group-hover:opacity-100"
                  )}>
                    <button
                      title={t.editNote}
                      onClick={() => startEdit(note)}
                      className="p-1 rounded hover:bg-muted transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button
                      title={t.deleteNote}
                      onClick={() => deleteMut.mutate(note._id)}
                      className="p-1 rounded hover:bg-muted hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
