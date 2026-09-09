type BrandMarkProps = {
  compact?: boolean;
};

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <div className="flex items-center gap-3" aria-label="Lectura Aumentada">
      <span className="grid size-11 place-items-center rounded-[15px] bg-brand text-lg font-black tracking-[-0.08em] text-white shadow-[0_10px_26px_rgba(229,55,52,0.28)]">
        LA
      </span>
      {!compact && (
        <span className="leading-tight">
          <strong className="block text-[1.05rem] font-extrabold text-ink">
            Lectura Aumentada
          </strong>
          <span className="text-sm font-medium text-muted">Panel docente</span>
        </span>
      )}
    </div>
  );
}
