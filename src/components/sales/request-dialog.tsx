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
import { Textarea } from "@/components/ui/textarea";
import { Field } from "./lead-dialog";
import { SERVICES_CATALOG } from "@/lib/sales-constants";

const SERVICE_OPTIONS = [...SERVICES_CATALOG, "Others"] as const;

/**
 * Log a new request on an existing deal. It appears as its own entry in Sales >
 * Clients with its own amount — the lead's original deal value is not touched.
 * The PO document is attached on the request card afterwards, the same way
 * proposal files are.
 */
export function RequestDialog({
  open,
  onClose,
  leadId,
}: {
  open: boolean;
  onClose: () => void;
  leadId: string;
}) {
  const qc = useQueryClient();

  type FormValues = {
    servicesOther: string;
    details: string;
    amount: string;
    currency: string;
    poNumber: string;
  };

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>();
  const [services, setServices] = React.useState<string[]>([]);
  const [servicesError, setServicesError] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    reset({ servicesOther: "", details: "", amount: "", currency: "EGP", poNumber: "" });
    setServices([]);
    setServicesError(false);
  }, [open, reset]);

  const othersOn = services.includes("Others");

  const save = useMutation({
    mutationFn: (v: FormValues) =>
      apiSend("/api/sales/requests", "POST", {
        leadId,
        services,
        servicesOther: othersOn ? v.servicesOther : undefined,
        details: v.details || undefined,
        amount: Number(v.amount),
        currency: v.currency || "EGP",
        poNumber: v.poNumber || undefined,
      }),
    onSuccess: () => {
      toast.success("Request added to Clients");
      qc.invalidateQueries({ queryKey: ["sales-lead"] });
      qc.invalidateQueries({ queryKey: ["sales-leads"] });
      qc.invalidateQueries({ queryKey: ["sales-clients"] });
      qc.invalidateQueries({ queryKey: ["sales-dashboard"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function submit(v: FormValues) {
    if (!services.length) {
      setServicesError(true);
      return;
    }
    save.mutate(v);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New request"
      description="Added as a separate client entry in Sales > Clients. The lead's deal value is not affected."
      className="max-w-xl"
    >
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <Field label="Services" required>
          <div className="flex flex-wrap gap-1.5">
            {SERVICE_OPTIONS.map((s) => {
              const on = services.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setServicesError(false);
                    setServices((prev) => (on ? prev.filter((x) => x !== s) : [...prev, s]));
                  }}
                  className={`rounded-lg border px-2.5 py-1 text-sm transition-colors ${
                    on
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
          {servicesError && (
            <p className="text-xs text-destructive">Pick at least one service.</p>
          )}
        </Field>

        {othersOn && (
          <Field label="Other service" required error={errors.servicesOther}>
            <Input
              {...register("servicesOther", {
                validate: (v) => !othersOn || v.trim() !== "" || "Describe the other service",
              })}
              placeholder="e.g. Event management"
              aria-invalid={Boolean(errors.servicesOther)}
            />
          </Field>
        )}

        <Field label="Details">
          <Textarea {...register("details")} rows={4} placeholder="Scope, deliverables, timing…" />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Field label="Amount" required error={errors.amount}>
              <Input
                type="number"
                min={0}
                step="any"
                {...register("amount", {
                  required: "Amount is required",
                  validate: (v) => Number(v) > 0 || "Amount must be greater than 0",
                })}
                aria-invalid={Boolean(errors.amount)}
              />
            </Field>
          </div>
          <Field label="Currency">
            <Input {...register("currency")} maxLength={8} />
          </Field>
        </div>

        <Field label="PO number" hint="Optional. Attach the PO file on the request after saving.">
          <Input {...register("poNumber")} placeholder="e.g. PO-2026-0142" />
        </Field>

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending && <Loader2 className="size-4 animate-spin" />}
            Add request
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
