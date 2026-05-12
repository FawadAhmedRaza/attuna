import { Eyebrow } from "@attuna/ui/Eyebrow";

type ComingSoonProps = {
  eyebrow: string;
  title: string;
  body: string;
};

export function ComingSoon({ eyebrow, title, body }: ComingSoonProps) {
  return (
    <div className="mx-auto w-full max-w-[720px]">
      <div className="bg-surface border-border rounded-[20px] border p-8 md:p-12">
        <Eyebrow flanked={false}>{eyebrow}</Eyebrow>
        <h1
          className="display text-ink mt-3 text-[32px] font-medium md:text-[40px]"
          style={{ letterSpacing: "-0.025em", lineHeight: 1.1 }}
        >
          {title}
        </h1>
        <p
          className="text-ink-soft tracking-body mt-4 max-w-[520px] text-[15px]"
          style={{ lineHeight: 1.65 }}
        >
          {body}
        </p>
      </div>
    </div>
  );
}

export default ComingSoon;
