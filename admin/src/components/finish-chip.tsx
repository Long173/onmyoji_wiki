/**
 * Small "Đã hoàn thành" / "Chưa xong" status chip used in list tables.
 * Green when the editorial `is_finish` flag is true, muted gray otherwise.
 */
export function FinishChip({ done }: { done: boolean }) {
  return done ? (
    <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300">
      ✓ Hoàn thành
    </span>
  ) : (
    <span className="rounded bg-white/5 px-2 py-0.5 text-xs font-semibold text-white/40">
      Chưa xong
    </span>
  );
}
