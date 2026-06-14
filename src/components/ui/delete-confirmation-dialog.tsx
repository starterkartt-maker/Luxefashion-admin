import { Loader2 } from "lucide-react";
import { Button } from "./button";

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  isDeleting?: boolean;
}

export function DeleteConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you absolutely sure?",
  description = "This action cannot be undone. This will permanently delete this item from our servers.",
  isDeleting = false,
}: DeleteConfirmationDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in font-sans">
      <div 
        className="relative w-full max-w-sm bg-white border border-gray-100 rounded-xl shadow-2xl p-6 space-y-6 transform animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
        </div>

        <div className="flex justify-end space-x-3">
          <Button
            variant="outline"
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="uppercase tracking-wide text-[11px] h-9"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="uppercase tracking-wide text-[11px] h-9 flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white"
          >
            {isDeleting && <Loader2 className="h-3 w-3 animate-spin" />}
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
