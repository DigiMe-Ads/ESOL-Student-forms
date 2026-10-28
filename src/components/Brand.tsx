export function Logo({ className = "h-9" }: { className?: string }) {
  return <img src="/brand/logo-wide.png" alt="ESOL Premier Campus" className={`${className} w-auto object-contain`} />;
}

export function LogoChip({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-xl bg-white px-3 py-2 shadow-sm ${className}`}>
      <Logo className="h-8" />
    </span>
  );
}
