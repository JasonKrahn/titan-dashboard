import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bold, Italic, Underline, List, Pencil, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { updateProjectNotes, type UpdateProjectNotesInput } from "@/lib/api";
import { relativeTime } from "@/lib/derived";

interface ProjectNotesProps {
  projectId: string;
  notes?: string;
  notesLastEditedBy?: string;
  notesLastEditedAt?: string;
  editorName?: string;
}

export function ProjectNotes({ projectId, notes, notesLastEditedBy, notesLastEditedAt, editorName }: ProjectNotesProps) {
  const qc = useQueryClient();
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draftNotes, setDraftNotes] = useState(notes || "");

  useEffect(() => {
    setDraftNotes(notes || "");
    if (editorRef.current && !isEditing) {
      editorRef.current.innerHTML = notes || "";
    }
  }, [notes, isEditing]);

  useEffect(() => {
    if (isEditing && editorRef.current) {
      editorRef.current.innerHTML = draftNotes;
      editorRef.current.focus();
    }
  }, [isEditing, draftNotes]);

  const mutation = useMutation({
    mutationFn: (input: UpdateProjectNotesInput) => updateProjectNotes(input),
    onSuccess: (res) => {
      if (res.ok === true) {
        qc.invalidateQueries({ queryKey: ["project", projectId] });
        toast.success("Notes saved");
        setIsEditing(false);
        return;
      }
      toast.error(res.error.message);
    },
  });

  const handleSave = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      mutation.mutate({ projectId, notes: content });
    }
  };

  const handleCancel = () => {
    setDraftNotes(notes || "");
    setIsEditing(false);
  };

  const formatText = (command: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(command, false);
    }
  };

  const hasNotes = Boolean(notes && notes.trim() && notes !== "<br>" && notes !== "<div><br></div>");

  return (
    <Card surface="default" className="p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <SectionHeading as="h3">Project Notes</SectionHeading>
        <div className="flex items-center gap-2">
          {notesLastEditedAt && !isEditing && (
            <span className="text-xs text-muted-foreground">
              {editorName ? `Last edited by ${editorName} ` : "Last edited "}
              {relativeTime(notesLastEditedAt)}
            </span>
          )}
          {!isEditing && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(true)}
              className="h-7 px-2"
            >
              <Pencil className="mr-1 h-3.5 w-3.5" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {isEditing ? (
        <>
          <div className="mb-2 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => formatText("bold")}
              title="Bold"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => formatText("italic")}
              title="Italic"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => formatText("underline")}
              title="Underline"
            >
              <Underline className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => formatText("insertUnorderedList")}
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <div
            ref={editorRef}
            contentEditable
            className="min-h-[150px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&_ul]:list-disc [&_ul]:list-inside [&_ul]:pl-4 [&_li]:my-1"
            style={{ minHeight: "150px" }}
            suppressContentEditableWarning
          />
          <div className="mt-3 flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Saving..." : "Save"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={mutation.isPending}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <div
          className="min-h-[60px] text-sm text-foreground [&_ul]:list-disc [&_ul]:list-inside [&_ul]:pl-4 [&_li]:my-1"
          dangerouslySetInnerHTML={{
            __html: hasNotes ? notes! : '<span class="text-muted-foreground italic">No notes yet. Click Edit to add notes.</span>'
          }}
        />
      )}
    </Card>
  );
}
