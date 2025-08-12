import * as Dialog from "@radix-ui/react-dialog";
import { ReactNode } from "react";

interface AccessibleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  hideTitle?: boolean;
  className?: string;
}

/**
 * Accessible Dialog component that properly implements Radix UI Dialog with required
 * title and description for accessibility.
 */
export function AccessibleDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  hideTitle = false,
  className = ""
}: AccessibleDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content 
          className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg focus:outline-none max-w-md w-full mx-4 ${className}`}
        >
          {/* Always include a title for accessibility, but optionally hide it visually */}
          <Dialog.Title className={hideTitle ? "sr-only" : "text-xl font-semibold mb-4"}>
            {title}
          </Dialog.Title>
          
          {/* Always include a description for accessibility, but it can be empty */}
          {description ? (
            <Dialog.Description className="text-sm text-gray-600 mb-4">
              {description}
            </Dialog.Description>
          ) : (
            <Dialog.Description className="sr-only">
              {title}
            </Dialog.Description>
          )}
          
          {children}
          
          <Dialog.Close asChild>
            <button
              className="absolute top-3 right-3 inline-flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              aria-label="Close dialog"
            >
              ×
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Utility classes for screen reader only content
export const srOnly = "absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0 clip-rect(0,0,0,0)";
