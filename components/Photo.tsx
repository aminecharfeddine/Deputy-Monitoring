"use client";

import { useEffect, useRef, useState } from "react";

/** Portrait officiel hébergé par l'institution ; masqué s'il ne charge pas. */
export function Photo({ src, alt, size, className = "" }: { src: string | null; alt: string; size: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  // L'erreur peut survenir avant l'hydratation : on vérifie l'état de l'image au montage.
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, [src]);

  if (!src || failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={ref} src={src} alt={alt} width={size} height={size} onError={() => setFailed(true)} className={className} />
  );
}
