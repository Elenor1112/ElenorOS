"use client";
import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Check, Paperclip, Upload, X } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DeadlinePicker } from "@/components/ui/deadline-picker";
import { apiGet, apiSend, apiUpload } from "@/lib/fetcher";
import { PRIORITY_META } from "@/lib/constants";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

type Meta = {
  projects: { id: string; name: string }[];
  clients: { id: string; company: string }[];
  labels: { id: string; name: string; color: string }[];
  departments: { id: string; name: string; color: string }[];
  assignable: { id: string; firstName: string; lastName: string; avatarUrl?: string | null; role: { name: string } }[];
};

export function CreateTaskDialog({
  open,
  onClose,
  defaultProjectId,
  defaultParentId,
}: {
  open: boolean;
  onClose: () => void;
  defaultProjectId?: string;
  defaultParentId?: string;
}) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, control } = useForm<any>();
  const { data: meta } = useQuery({
    queryKey: ["task-meta"],
    queryFn: () => apiGet<Meta>("/api/tasks/meta"),
    enabled: open,
  });

  const [assignees, setAssignees] = React.useState<string[]>([]);
  const [labels, setLabels] = React.useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = React.useState<File[]>([]);
  const fileInput = React.useRef<HTMLInputElement>(null);

  const create = useMutation({
    mutationFn: async (values: any) => {
      const { task } = await apiSend<{ task: { id: string } }>("/api/tasks", "POST", {
        ...values,
        // The picker uses "" for "no deadline"; the API wants null.
        deadline: values.deadline || null,
        estimatedHours: values.estimatedHours ? Number(values.estimatedHours) : null,
        projectId: values.projectId || defaultProjectId || null,
        parentId: defaultParentId || null,
        assigneeIds: assignees,
        labelIds: labels,
      });
      // Attachments upload after creation — a task has to exist before a file
      // can be attached to it. A failed upload here does not roll back the
      // task; the user still has a task, just without that one file.
      for (const file of pendingFiles) {
        const form = new FormData();
        form.append("file", file);
        try {
          await apiUpload(`/api/tasks/${task.id}/attachments`, form);
        } catch (e) {
          toast.error(`"${file.name}" could not be attached: ${(e as Error).message}`);
        }
      }
      return task;
    },
    onSuccess: () => {
      toast.success("Task created");
      qc.invalidateQueries({ queryKey: ["tasks"] });
      reset(); setAssignees([]); setLabels([]); setPendingFiles([]);
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function addFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    const oversized = [...fileList].filter((f) => f.size > MAX_ATTACHMENT_BYTES);
    if (oversized.length) {
      toast.error(`Files must be ${MAX_ATTACHMENT_BYTES / 1024 / 1024}MB or smaller.`);
    }
    const accepted = [...fileList].filter((f) => f.size > 0 && f.size <= MAX_ATTACHMENT_BYTES);
    if (accepted.length) setPendingFiles((prev) => [...prev, ...accepted]);
  }

  return (
    <Dialog open={open} onClose={onClose} title={defaultParentId ? "New subtask" : "New task"} className="max-w-2xl">
      <form onSubmit={handleSubmit((v) => create.mutate(v))} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input {...register("title", { required: true })} placeholder="What needs to be done?" autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Textarea {...register("description")} placeholder="Add details…" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select {...register("priority")} defaultValue="MEDIUM">
              {Object.entries(PRIORITY_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5 col-span-2 sm:col-span-1">
            <Label htmlFor="task-deadline">Deadline</Label>
            <Controller
              name="deadline"
              control={control}
              defaultValue=""
              render={({ field }) => (
                <DeadlinePicker id="task-deadline" value={field.value ?? ""} onChange={field.onChange} />
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Est. hours</Label>
            <Input type="number" step="0.5" {...register("estimatedHours")} />
          </div>
        </div>
        {!defaultProjectId && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Project</Label>
              <Select {...register("projectId")} defaultValue="">
                <option value="">None</option>
                {meta?.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select {...register("departmentId")} defaultValue="">
                <option value="">None</option>
                {meta?.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            </div>
          </div>
        )}

        {/* assignees */}
        <div className="space-y-1.5">
          <Label>Assignees</Label>
          <div className="flex flex-wrap gap-1.5">
            {meta?.assignable.map((u) => {
              const active = assignees.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setAssignees((a) => active ? a.filter((x) => x !== u.id) : [...a, u.id])}
                  className={`flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-xs transition-colors ${
                    active ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"
                  }`}
                >
                  <Avatar firstName={u.firstName} lastName={u.lastName} src={u.avatarUrl} size={20} />
                  {u.firstName} {active && <Check className="size-3" />}
                </button>
              );
            })}
            {meta && meta.assignable.length === 0 && (
              <span className="text-xs text-muted-foreground">Your role can&apos;t assign tasks to others.</span>
            )}
          </div>
        </div>

        {/* labels */}
        {meta && meta.labels.length > 0 && (
          <div className="space-y-1.5">
            <Label>Labels</Label>
            <div className="flex flex-wrap gap-1.5">
              {meta.labels.map((l) => {
                const active = labels.includes(l.id);
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setLabels((a) => active ? a.filter((x) => x !== l.id) : [...a, l.id])}
                    className="transition-transform hover:scale-105"
                    style={{ opacity: active ? 1 : 0.5 }}
                  >
                    <Badge color={l.color}>{active && <Check className="size-3" />} {l.name}</Badge>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* attachments */}
        <div className="space-y-1.5">
          <Label>Attachment (optional)</Label>
          <input
            ref={fileInput}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          {pendingFiles.length > 0 && (
            <div className="space-y-1">
              {pendingFiles.map((f, i) => (
                <div key={`${f.name}-${i}`} className="flex items-center gap-1.5 text-sm">
                  <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{f.name}</span>
                  <span className="text-[11px] text-muted-foreground">{formatBytes(f.size)}</span>
                  <button
                    type="button"
                    onClick={() => setPendingFiles((prev) => prev.filter((_, x) => x !== i))}
                    className="ml-auto rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <Button type="button" size="sm" variant="outline" onClick={() => fileInput.current?.click()}>
            <Upload className="mr-1.5 size-3.5" /> Attach file
          </Button>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending && <Loader2 className="size-4 animate-spin" />} Create task
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
