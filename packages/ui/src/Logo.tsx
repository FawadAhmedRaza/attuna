import { LogoMark } from "./LogoMark";

type LogoProps = {
  small?: boolean;
};

export function Logo({ small = false }: LogoProps) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={small ? 26 : 32} />
      <span
        className="display text-ink font-medium"
        style={{
          fontSize: small ? 18 : 22,
          letterSpacing: "-0.015em",
        }}
      >
        Attuna
      </span>
    </div>
  );
}

export default Logo;
