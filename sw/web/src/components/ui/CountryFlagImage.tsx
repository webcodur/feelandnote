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
    className={`flag:${flagCode} inline-block h-[1em] w-[1.5em] shrink-0 bg-cover bg-center bg-no-repeat align-middle ${className}`}
    style={{ backgroundImage: `url(/api/flag/${flagCode})` }}
    role={label ? "img" : undefined}
    aria-label={label}
    aria-hidden={!label || undefined}
  />;
}
