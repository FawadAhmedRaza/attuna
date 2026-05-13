import { Logo } from "./Logo";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-border-soft border-t px-5 py-8 md:px-10 md:py-10">
      <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-4">
        <Logo small />
        <p
          className="display-text text-ink-mute tracking-body m-0 text-[14px] font-normal italic"
          aria-label="Attuna observes. It does not diagnose."
        >
          Attuna observes. It does not diagnose.
        </p>
        <span className="text-ink-faint text-[12px] font-medium">© {year} · Made in Karachi</span>
      </div>
    </footer>
  );
}

export default Footer;
