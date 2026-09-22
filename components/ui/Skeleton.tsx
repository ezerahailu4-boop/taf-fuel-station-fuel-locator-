export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-2xl bg-black/10 dark:bg-white/10 ${className}`} />;
}
