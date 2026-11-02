export function Logo({ className = "h-9" }: { className?: string }) {
  return <img src="/brand/logo-wide.png" alt="ESOL Premier Campus" className={`${className} w-auto object-contain`} />;
}

/** Shield only, for small round or square spots where the wordmark would be unreadable. */
export function LogoMark({ className = "h-14 w-14" }: { className?: string }) {
  return <img src="/brand/logo-mark.png" alt="ESOL Premier Campus" className={`${className} object-contain`} />;
}

export function LogoChip({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-xl bg-white px-3 py-2 shadow-sm ${className}`}>
      <Logo className="h-8" />
    </span>
  );
}
