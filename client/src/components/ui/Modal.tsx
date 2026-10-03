import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

/** Accessible dialog built on <dialog>: focus trap, Esc to close, backdrop click. */
export function Modal({ open, onClose, title, description, children }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="modal-title"
      className="m-auto w-[min(560px,calc(100vw-32px))] rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-[2px]"
    >
      {open && (
        <div className="p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 id="modal-title" className="text-lg font-semibold tracking-[-0.01em]">{title}</h2>
              {description && <p className="mt-1 text-[13.5px] text-ink-3">{description}</p>}
            </div>
            <button onClick={onClose} className="rounded-md p-1 text-ink-3 hover:bg-surface-2 hover:text-ink" aria-label="Close dialog">
              <X className="h-5 w-5" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
