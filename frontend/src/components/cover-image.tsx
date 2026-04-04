import Image from "next/image";
import { mediaUrl } from "@/lib/media";
import type { MediaRead } from "@/lib/schemas";

interface CoverImageProps {
  cover: MediaRead | null;
  alt: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
}

export function CoverImage({ cover, alt, className, fill, width = 640, height = 360 }: CoverImageProps) {
  if (!cover) {
    return (
      <div
        className={`bg-muted flex items-center justify-center ${className ?? ""}`}
        style={fill ? undefined : { width, height }}
        aria-hidden
      />
    );
  }

  return fill ? (
    <Image
      src={mediaUrl(cover.path)}
      alt={alt}
      fill
      className={`object-cover ${className ?? ""}`}
      sizes="(max-width: 768px) 100vw, 50vw"
    />
  ) : (
    <Image
      src={mediaUrl(cover.path)}
      alt={alt}
      width={width}
      height={height}
      className={`object-cover ${className ?? ""}`}
    />
  );
}
