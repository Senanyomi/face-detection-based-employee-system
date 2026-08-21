interface BrandMarkProps {
  size?: number;
  className?: string;
}

/**
 * The Emprod monogram: a geometric "E" with a solid accent point standing in
 * for the product's face-recognition focus. Colors are drawn from
 * var(--brand)/var(--cyan-glow), which index.css flips per light/dark — no
 * per-theme branching needed here.
 */
export function BrandMark({ size = 40, className }: BrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      role="img"
      aria-label="Emprod"
      className={className}
    >
      <rect width="40" height="40" rx="11" fill="var(--brand)" />
      <rect x="9" y="9" width="4.4" height="22" rx="2.2" fill="white" />
      <rect x="9" y="9" width="17" height="4.4" rx="2.2" fill="white" />
      <rect x="9" y="17.8" width="12" height="4.4" rx="2.2" fill="white" />
      <rect x="9" y="26.6" width="17" height="4.4" rx="2.2" fill="white" />
      <circle cx="32" cy="9" r="3" fill="var(--cyan-glow)" />
    </svg>
  );
}
