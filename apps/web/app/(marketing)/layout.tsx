export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-surface="marketing" className="bg-bg text-ink min-h-screen">
      {children}
    </div>
  );
}
