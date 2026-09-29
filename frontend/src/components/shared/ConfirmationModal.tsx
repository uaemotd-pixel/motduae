"use client";

type ConfirmationModalProps = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  isDanger?: boolean;
  confirmDisabled?: boolean;
  children?: React.ReactNode;
};

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  isLoading = false,
  isDanger = false,
  confirmDisabled = false,
  children,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && !isLoading && onCancel()}
    >
      <div className="max-h-[min(92dvh,92vh)] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-gray-100 bg-white shadow-xl sm:rounded-2xl">
        <div className="p-4 sm:p-6">
          <h3 className="text-lg font-medium text-black">{title}</h3>
          {message ? (
            <p className="mt-2 text-sm text-gray-600">{message}</p>
          ) : null}
          {children}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="w-full whitespace-nowrap px-4 py-2.5 text-sm font-medium text-black bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition hover:cursor-pointer sm:w-auto"
              disabled={isLoading}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`w-full whitespace-nowrap px-4 py-2.5 text-sm font-medium text-white rounded-lg transition disabled:cursor-not-allowed disabled:opacity-50 hover:cursor-pointer sm:w-auto ${
                isDanger
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-black hover:bg-gray-800"
              }`}
              disabled={isLoading || confirmDisabled}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
