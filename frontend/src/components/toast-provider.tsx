"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
} from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "default" | "success" | "error";

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

type Action = { type: "add"; item: Toast } | { type: "remove"; id: string };

function reducer(state: Toast[], action: Action): Toast[] {
  switch (action.type) {
    case "add":
      // Keep max 5 visible at once
      return [...state.slice(-4), action.item];
    case "remove":
      return state.filter((t) => t.id !== action.id);
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, dispatch] = useReducer(reducer, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = "default") => {
      const id = Math.random().toString(36).slice(2);
      dispatch({ type: "add", item: { id, message, variant } });
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <ToastItem
            key={t.id}
            toast={t}
            onDismiss={() => dispatch({ type: "remove", id: t.id })}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3500);
    return () => clearTimeout(timer);
    // toast.id is stable for the lifetime of this item; onDismiss closes over the same id
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.id]);

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-center gap-3 rounded-lg border bg-card px-4 py-3 shadow-lg text-sm min-w-60 max-w-sm",
        toast.variant === "success" && "border-l-4 border-l-green-500",
        toast.variant === "error" && "border-l-4 border-l-destructive",
      )}
    >
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={onDismiss}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
