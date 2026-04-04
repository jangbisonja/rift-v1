"use client";

import { mediaUrl } from "@/lib/media";
import type { MediaRead } from "@/lib/schemas";

interface MediaPickerModalProps {
  open: boolean;
  items: MediaRead[];
  onSelect: (url: string) => void;
  onClose: () => void;
}

export function MediaPickerModal({ open, items, onSelect, onClose }: MediaPickerModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-xl border shadow-xl w-full max-w-lg mx-4 p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base">Pick from media library</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-xl leading-none"
          >
            ×
          </button>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No media attached to this post yet.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto">
            {items.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelect(mediaUrl(m.path))}
                className="group rounded-lg border overflow-hidden bg-muted/20 hover:ring-2 hover:ring-ring focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaUrl(m.path)}
                  alt={m.original_name}
                  className="aspect-square w-full object-cover"
                />
                <p className="text-xs text-muted-foreground truncate px-1.5 py-1">
                  {m.original_name}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
