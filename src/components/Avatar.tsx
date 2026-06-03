interface AvatarProps {
  src: string;
  alt: string;
  className?: string;
}

export function Avatar({ src, alt, className }: AvatarProps) {
  return (
    <img
      src={src}
      alt={alt}
      className={`inline-block rounded-full ring-2 ring-white dark:ring-usa-slate object-cover bg-usa-smoke dark:bg-usa-slate ${className ?? ""}`}
      loading="lazy"
    />
  );
}
