import { getCountryFlagCode } from "@/lib/utils/countryFlag";

interface Props {
  code: string | null | undefined;
  label?: string;
  className?: string;
}

export default function CountryFlagImage({ code, label, className = "" }: Props) {
  const flagCode = getCountryFlagCode(code);
  if (!flagCode) return null;

  return <span
    className={`flag:${flagCode} shrink-0 align-middle ${className}`}
    role={label ? "img" : undefined}
    aria-label={label}
    aria-hidden={!label || undefined}
  />;
}
