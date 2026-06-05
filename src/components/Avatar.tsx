interface AvatarProps {
  src: string;
  alt: string;
  className?: string;
}

export function Avatar({ src, alt, className }: AvatarProps) {
  const resolved = /^(https?:)?\/\//.test(src) ? src : `${import.meta.env.BASE_URL}${src.replace(/^\//, "")}`;
  return (
    <img
      src={resolved}
      alt={alt}
      className={`inline-block rounded-full ring-2 ring-white dark:ring-usa-slate object-cover bg-usa-smoke dark:bg-usa-slate ${className ?? ""}`}
      loading="lazy"
    />
  );
}
