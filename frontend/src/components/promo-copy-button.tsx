"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface PromoCopyButtonProps {
  promoCode: string;
}

export function PromoCopyButton({ promoCode }: PromoCopyButtonProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(promoCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
      aria-label="Скопировать промокод"
    >
      {copied ? (
        <Check size={14} className="text-green-500" />
      ) : (
        <Copy size={14} />
      )}
    </button>
  );
}
