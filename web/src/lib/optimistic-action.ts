import { toast } from 'sonner';

/**
 * Run an async mutation with instant UI feedback and optional undo on failure.
 */
export async function runOptimisticAction<T>(opts: {
  label: string;
  action: () => Promise<T>;
  onOptimistic?: () => void;
  onRollback?: () => void;
  onSuccess?: (result: T) => void;
  undoLabel?: string;
}): Promise<T | undefined> {
  opts.onOptimistic?.();
  const toastId = toast.loading(opts.label);
  try {
    const result = await opts.action();
    toast.success(`${opts.label} — done`, { id: toastId });
    opts.onSuccess?.(result);
    return result;
  } catch (e) {
    opts.onRollback?.();
    const message = e instanceof Error ? e.message : 'Request failed';
    toast.error(message, {
      id: toastId,
      action: opts.onRollback
        ? {
            label: opts.undoLabel ?? 'Dismiss',
            onClick: () => {},
          }
        : undefined,
    });
    return undefined;
  }
}
