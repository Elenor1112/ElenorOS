"use client";
import * as React from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { apiSend } from "@/lib/fetcher";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "./lead-dialog";

export const RATING_WORDS = ["Very poor", "Poor", "Average", "Good", "Excellent"];

type FormValues = {
  period: string;
  rating: string;
  strengths: string;
  improvements: string;
  actionItems: string;
};

/**
 * A manager's written evaluation of one salesperson. Private to holders of
 * Sales.ViewTeam — the subject is not notified and cannot read it.
 */
export function MemberFeedbackDialog({
  open,
  onClose,
  userId,
  name,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  name: string;
}) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>();

  React.useEffect(() => {
    if (!open) return;
    reset({
      period: new Date().toISOString().slice(0, 7),
      rating: "",
      strengths: "",
      improvements: "",
      actionItems: "",
    });
  }, [open, reset]);

  const save = useMutation({
    mutationFn: (v: FormValues) =>
      apiSend("/api/sales/team/feedback", "POST", {
        subjectId: userId,
        period: v.period,
        rating: Number(v.rating),
        strengths: v.strengths || null,
        improvements: v.improvements || null,
        actionItems: v.actionItems || null,
      }),
    onSuccess: () => {
      toast.success("Feedback saved");
      qc.invalidateQueries({ queryKey: ["sales-member-feedback", userId] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Feedback for ${name}`}
      description="Visible to sales managers only — the team member is not notified."
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Period" required error={errors.period}>
            <Input type="month" {...register("period", { required: "Period is required" })} />
          </Field>
          <Field label="Overall rating" required error={errors.rating}>
            <Select {...register("rating", { required: "Pick a rating" })}>
              <option value="">Select…</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>{n} — {RATING_WORDS[n - 1]}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Strengths">
          <Textarea {...register("strengths")} rows={3} />
        </Field>
        <Field label="Areas to improve">
          <Textarea {...register("improvements")} rows={3} />
        </Field>
        <Field label="Action items">
          <Textarea {...register("actionItems")} rows={3} />
        </Field>

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending && <Loader2 className="size-4 animate-spin" />}
            Save feedback
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
