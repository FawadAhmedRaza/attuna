type LogoMarkProps = {
  size?: number;
};

export function LogoMark({ size = 32 }: LogoMarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="14" fill="none" stroke="var(--accent)" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="8" fill="var(--accent)" />
      <circle cx="16" cy="16" r="3" fill="var(--bg)" />
    </svg>
  );
}

export default LogoMark;
