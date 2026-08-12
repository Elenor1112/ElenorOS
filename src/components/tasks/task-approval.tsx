"use client";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ShieldCheck, Upload, Link2, FileText, X, Paperclip, ThumbsUp, RotateCcw, Send,
} from "lucide-react";
import { apiGet, apiSend } from "@/lib/fetcher";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatExactDateTime, fullName } from "@/lib/utils";
import { useSession } from "@/components/session-context";
import { canSubmitForApproval, canDecideApproval, isApproverFor, wouldSelfApprove } from "@/lib/rbac";
import type { SessionUser } from "@/lib/rbac";

/**
 * The approval panel: submit work for review, and decide a submission.
 *
 * Every gate rendered here mirrors a rule the API enforces in
 * lib/task-lifecycle.ts — the UI never decides who may do what, it only avoids
 * offering a control that would come back a 403. The submit form's "attach
 * something" rule is duplicated client-side purely so the user finds out before
 * a round trip, not because the button is the enforcement point.
 */

type EvidenceFile = { id: string; name: string; mimeType: string; size: number };

export function TaskApproval({ task, taskId }: { task: any; taskId: string }) {
  const me = useSession() as SessionUser;
  const qc = useQueryClient();

  const shape = {
    status: task.status,
    createdById: task.createdById,
    assignees: (task.assignees ?? []).map((a: any) => ({ userId: a.user?.id ?? a.userId })),
    workerId: task.workerId ?? null,
  };

  const submissions: any[] = task.submissions ?? [];
  const openSubmission = submissions.find((s) => s.decision === "PENDING") ?? null;
  const history = submissions.filter((s) => s.decision !== "PENDING");

  const underReview = task.status === "WAITING_APPROVAL";
  const canSubmit = canSubmitForApproval(me, shape) && !underReview && task.status !== "DONE";
  const canDecide = canDecideApproval(me, shape, openSubmission);
  // A reviewer looking at their own submission gets the explanation rather than
  // silence — otherwise the panel looks broken to the person who submitted.
  const blockedBySelf = underReview && isApproverFor(me, shape) && wouldSelfApprove(me, openSubmission);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["task", taskId] });
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <ShieldCheck className="size-4 text-muted-foreground" /> Approval
      </div>

      {task.status === "DONE" && task.approvedBy && (
        <div className="rounded-xl border border-success/30 bg-success/5 p-3 text-sm">
          <span className="font-medium text-success">Approved</span> by{" "}
          {fullName(task.approvedBy)}
          {task.approvedAt && (
            <span className="text-muted-foreground"> · {formatExactDateTime(task.approvedAt)}</span>
          )}
        </div>
      )}

      {openSubmission && (
        <SubmissionCard
          submission={openSubmission}
          label={`Submitted for approval${task.submittedAt ? ` · ${formatExactDateTime(task.submittedAt)}` : ""}`}
        />
      )}

      {canDecide && <DecisionControls taskId={taskId} onDone={invalidate} />}

      {blockedBySelf && (
        <p className="mt-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          You submitted this work, so it needs a decision from another approver.
        </p>
      )}

      {underReview && !canDecide && !blockedBySelf && (
        <p className="mt-2 text-xs text-muted-foreground">
          Waiting for an approver to review the submission above.
        </p>
      )}

      {canSubmit && <SubmitForm taskId={taskId} onDone={invalidate} isResubmit={history.length > 0} />}

      {history.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            Previous submissions ({history.length})
          </summary>
          <div className="mt-2 space-y-2">
            {history.map((s) => (
              <SubmissionCard
                key={s.id}
                submission={s}
                label={`${s.decision === "APPROVED" ? "Approved" : "Changes requested"}${
                  s.decidedAt ? ` · ${formatExactDateTime(s.decidedAt)}` : ""
                }`}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

/** One submission's evidence, as the approver sees it. */
function SubmissionCard({ submission, label }: { submission: any; label: string }) {
  const rejected = submission.decision === "REJECTED";
  const approved = submission.decision === "APPROVED";
  return (
    <div
      className={`rounded-xl border p-3 ${
        rejected ? "border-destructive/30 bg-destructive/5"
        : approved ? "border-success/30 bg-success/5"
        : "border-border bg-background"
      }`}
    >
      <div className="flex items-center gap-2">
        <Avatar
          firstName={submission.submittedBy.firstName}
          lastName={submission.submittedBy.lastName}
          src={submission.submittedBy.avatarUrl}
          size={24}
        />
        <span className="text-sm font-medium">{fullName(submission.submittedBy)}</span>
        <span className="ml-auto text-[11px] text-muted-foreground">{label}</span>
      </div>

      {submission.notes && (
        <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">{submission.notes}</p>
      )}

      {submission.url && (
        <a
          href={submission.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <Link2 className="size-3.5 shrink-0" />
          <span className="truncate">{submission.url}</span>
        </a>
      )}

      {submission.files?.length > 0 && (
        <div className="mt-2 space-y-1">
          {submission.files.map((f: EvidenceFile) => (
            <a
              key={f.id}
              href={`/api/tasks/submission-files/${f.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <FileText className="size-3.5 shrink-0" />
              <span className="truncate">{f.name}</span>
              <span className="text-[11px] text-muted-foreground">{formatBytes(f.size)}</span>
            </a>
          ))}
        </div>
      )}

      {/* The decision comment — the rejection reason the worker has to act on. */}
      {submission.comment && (
        <p className="mt-2 border-t border-border/60 pt-2 text-sm">
          <span className="text-muted-foreground">
            {submission.decidedBy ? `${fullName(submission.decidedBy)}: ` : ""}
          </span>
          {submission.comment}
        </p>
      )}
    </div>
  );
}

/** Approve / request changes. A rejection reason is required, as the API insists. */
function DecisionControls({ taskId, onDone }: { taskId: string; onDone: () => void }) {
  const [rejecting, setRejecting] = React.useState(false);
  const [comment, setComment] = React.useState("");

  const decide = useMutation({
    mutationFn: (body: { decision: "approve" | "reject"; comment?: string }) =>
      apiSend(`/api/tasks/${taskId}/approval`, "POST", body),
    onSuccess: (_d, vars) => {
      toast.success(vars.decision === "approve" ? "Task approved" : "Sent back for changes");
      setRejecting(false);
      setComment("");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mt-2 space-y-2">
      {rejecting ? (
        <>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What needs changing? The worker sees this."
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              disabled={!comment.trim() || decide.isPending}
              onClick={() => decide.mutate({ decision: "reject", comment })}
            >
              <RotateCcw className="mr-1.5 size-3.5" /> Send back for changes
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRejecting(false)}>
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={decide.isPending}
            onClick={() => decide.mutate({ decision: "approve" })}
          >
            <ThumbsUp className="mr-1.5 size-3.5" /> Approve
          </Button>
          <Button size="sm" variant="outline" onClick={() => setRejecting(true)}>
            <RotateCcw className="mr-1.5 size-3.5" /> Request changes
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * The submit form: notes, a link, and file uploads.
 *
 * Files upload immediately (before the submission exists) and are claimed when
 * the form is submitted — see the submission-files route for why. Any drafts left
 * from a previous visit are reloaded so a closed drawer does not lose them.
 */
function SubmitForm({
  taskId, onDone, isResubmit,
}: { taskId: string; onDone: () => void; isResubmit: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [notes, setNotes] = React.useState("");
  const [url, setUrl] = React.useState("");
  const fileInput = React.useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { data: draftData } = useQuery({
    queryKey: ["task-submission-drafts", taskId],
    queryFn: () => apiGet<{ files: EvidenceFile[] }>(`/api/tasks/${taskId}/submission-files`),
    enabled: open,
  });
  const files = draftData?.files ?? [];

  const refreshDrafts = () =>
    qc.invalidateQueries({ queryKey: ["task-submission-drafts", taskId] });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/tasks/${taskId}/submission-files`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Upload failed");
      }
      return res.json();
    },
    onSuccess: refreshDrafts,
    onError: (e: Error) => toast.error(e.message),
  });

  const removeFile = useMutation({
    mutationFn: (fileId: string) => apiSend(`/api/tasks/submission-files/${fileId}`, "DELETE"),
    onSuccess: refreshDrafts,
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = useMutation({
    mutationFn: () =>
      apiSend(`/api/tasks/${taskId}/submit`, "POST", {
        notes: notes.trim() || null,
        url: url.trim() || null,
        fileIds: files.map((f) => f.id),
      }),
    onSuccess: () => {
      toast.success("Submitted for approval");
      setNotes("");
      setUrl("");
      setOpen(false);
      refreshDrafts();
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Mirrors the server's rule so the user is told before a round trip.
  const hasEvidence = Boolean(notes.trim() || url.trim() || files.length);

  if (!open) {
    return (
      <Button size="sm" className="mt-2" onClick={() => setOpen(true)}>
        <Send className="mr-1.5 size-3.5" />
        {isResubmit ? "Resubmit for approval" : "Submit for approval"}
      </Button>
    );
  }

  return (
    <div className="mt-2 space-y-2 rounded-xl border border-border bg-background p-3">
      <p className="text-xs text-muted-foreground">
        Attach proof of completion — a file, a link, or a note. At least one is required.
      </p>

      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Describe what you delivered…"
      />

      <div className="flex items-center gap-2">
        <Link2 className="size-4 shrink-0 text-muted-foreground" />
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://… (Drive, Figma, live link)"
          className="h-8"
        />
      </div>

      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-1.5 text-sm">
              <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{f.name}</span>
              <span className="text-[11px] text-muted-foreground">{formatBytes(f.size)}</span>
              <button
                type="button"
                onClick={() => removeFile.mutate(f.id)}
                className="ml-auto rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileInput}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload.mutate(file);
          e.target.value = "";
        }}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={upload.isPending}
          onClick={() => fileInput.current?.click()}
        >
          <Upload className="mr-1.5 size-3.5" />
          {upload.isPending ? "Uploading…" : "Attach file"}
        </Button>
        <Button
          size="sm"
          disabled={!hasEvidence || submit.isPending}
          onClick={() => submit.mutate()}
        >
          <Send className="mr-1.5 size-3.5" /> Submit
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
