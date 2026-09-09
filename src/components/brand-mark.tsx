import Image from "next/image";

type BrandMarkProps = {
  compact?: boolean;
  inverse?: boolean;
};

export function BrandMark({ compact = false, inverse = false }: BrandMarkProps) {
  return (
    <div className="flex items-center gap-3" aria-label="Lectura Aumentada">
      <Image
        src="/logo-lectura-aumentada.svg"
        width={116}
        height={116}
        alt=""
        className="size-14 shrink-0 drop-shadow-[0_8px_18px_rgba(229,55,52,0.2)]"
      />
      {!compact && (
        <span className="leading-tight">
          <strong className={`block text-[1.05rem] font-extrabold ${inverse ? "text-white" : "text-ink"}`}>
            Lectura Aumentada
          </strong>
          <span className={`text-sm font-medium ${inverse ? "text-white/70" : "text-muted"}`}>
            Panel docente
          </span>
        </span>
      )}
    </div>
  );
}
