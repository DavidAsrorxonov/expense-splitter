"use client";

import { useRef, type ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

type FormDialogProps = {
  title: string;
  description: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  primary?: boolean;
  children: ReactNode;
};

export function FormDialog({ title, description, open, onOpenChange, primary, children }: FormDialogProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} disablePointerDismissal>
      <Dialog.Trigger render={<Button variant={primary ? "default" : "outline"} />}>{title}</Dialog.Trigger>
      {/* Keep drafts and in-flight actions alive when the dialog is closed. */}
      <Dialog.Portal keepMounted>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-background/80 data-closed:hidden" />
        <Dialog.Popup initialFocus={titleRef}
          className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain border border-input bg-background p-6 text-foreground data-closed:hidden">
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title ref={titleRef} tabIndex={-1} className="pt-2 text-xl font-medium">{title}</Dialog.Title>
            <Dialog.Close render={<Button variant="ghost" size="icon" />} aria-label={`Close ${title.toLowerCase()}`}>
              <X aria-hidden="true" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-2 text-sm text-text-secondary">{description}</Dialog.Description>
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
