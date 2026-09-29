import Image from "next/image";
import { GiftIllustration } from "@/components/gift-illustration";

export function GiftImage({
  imageUrl,
  category,
  alt,
  className,
}: {
  imageUrl: string | null;
  category: string;
  alt: string;
  className?: string;
}) {
  if (imageUrl) {
    return (
      <div className={`relative overflow-hidden bg-muted ${className ?? ""}`}>
        <Image
          src={imageUrl}
          alt={alt}
          fill
          sizes="(max-width: 640px) 50vw, 320px"
          className="object-cover"
        />
      </div>
    );
  }
  return (
    <div
      className={`grid place-items-center bg-gradient-to-br from-secondary via-muted to-[#f3e3d3] text-foreground ${className ?? ""}`}
    >
      <GiftIllustration category={category} className="size-[min(9rem,60%)]" />
    </div>
  );
}