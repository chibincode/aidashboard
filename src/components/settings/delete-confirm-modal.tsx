"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { SettingsModalShell } from "@/components/settings/settings-modal-shell";

type DeleteAction = (formData: FormData) => Promise<void>;

export function DeleteConfirmModal({
  open,
  title,
  description,
  warningTitle,
  warningDescription,
  itemId,
  deleteAction,
  confirmLabel,
  pendingLabel,
  disabled,
  onClose,
  onSuccess,
  children,
}: {
  open: boolean;
  title: string;
  description: string;
  warningTitle: string;
  warningDescription: string;
  itemId: string;
  deleteAction: DeleteAction;
  confirmLabel: string;
  pendingLabel: string;
  disabled?: boolean;
  onClose: () => void;
  onSuccess: () => void;
  children?: React.ReactNode;
}) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <SettingsModalShell open={open} title={title} description={description} onClose={onClose} widthClassName="md:max-w-[560px]">
      {open ? (
        <div className="grid gap-5">
          <div className="rounded-[22px] border border-[#fecaca] bg-[#fff1f2] px-4 py-4 text-sm leading-6 text-[#991b1b]">
            <p className="font-semibold text-[#7f1d1d]">{warningTitle}</p>
            <p className="mt-1">{warningDescription}</p>
          </div>

          {children ? <div className="rounded-[22px] border border-black/8 bg-white px-4 py-4">{children}</div> : null}

          <div className="grid gap-4">
            {errorMessage ? (
              <div className="rounded-2xl border border-[#fecaca] bg-[#fff1f2] px-4 py-3 text-sm text-[#991b1b]">{errorMessage}</div>
            ) : null}

            <form
              action={deleteAction}
              onSubmit={(event) => {
                event.preventDefault();
                setErrorMessage(null);

                const formData = new FormData(event.currentTarget);

                startTransition(async () => {
                  try {
                    await deleteAction(formData);
                    onSuccess();
                  } catch (error) {
                    setErrorMessage(error instanceof Error ? error.message : "Could not delete item.");
                  }
                });
              }}
              className="flex flex-wrap justify-end gap-2"
            >
              <input type="hidden" name="id" value={itemId} />
              <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" variant="danger" disabled={disabled} loading={isPending} loadingLabel={pendingLabel}>
                {confirmLabel}
              </Button>
            </form>
          </div>
        </div>
      ) : null}
    </SettingsModalShell>
  );
}
