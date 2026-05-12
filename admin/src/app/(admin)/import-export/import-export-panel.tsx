'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';

interface SheetResult {
  upserted: number;
  errors: { excelRow: number; id: string; error: string }[];
}

interface ImportResult {
  shikigami: SheetResult;
  souls: SheetResult;
  effects: SheetResult;
}

export function ImportExportPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleImport = async (file: File) => {
    setResult(null);
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/import', {
        method: 'POST',
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(`Import lỗi: ${json.error ?? res.statusText}`);
        return;
      }
      setResult(json as ImportResult);
      const total =
        json.shikigami.upserted + json.souls.upserted + json.effects.upserted;
      const errors =
        json.shikigami.errors.length +
        json.souls.errors.length +
        json.effects.errors.length;
      if (errors === 0) {
        toast.success(`Đã upsert ${total} record.`);
      } else {
        toast.error(
          `Upsert ${total} record, ${errors} lỗi — xem chi tiết phía dưới.`,
        );
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Download ─────────────────────────── */}
      <section className="card p-6">
        <h2 className="mb-2 text-lg font-semibold text-[var(--color-brand-gold)]">
          1. Tải file Excel hiện tại
        </h2>
        <p className="mb-4 text-sm text-white/60">
          File gồm 3 sheet — Shikigami / Souls / Effects — đã flatten cho dễ
          sửa. Các field lồng như <code>skills</code> /{' '}
          <code>soul effects</code> lưu thành cột JSON (chuỗi JSON 1 dòng).
        </p>
        <a
          href="/api/export"
          download
          className="btn-primary hover:btn-primary-hover inline-block"
        >
          📥 Tải .xlsx
        </a>
      </section>

      {/* ── Upload ───────────────────────────── */}
      <section className="card p-6">
        <h2 className="mb-2 text-lg font-semibold text-[var(--color-brand-gold)]">
          2. Upload file đã sửa
        </h2>
        <p className="mb-4 text-sm text-white/60">
          Server sẽ <strong>upsert</strong> theo cột <code>id</code>: dòng có
          id trùng record cũ → cập nhật; id mới → tạo mới. Dòng có id rỗng bị
          bỏ qua. Không xoá record bằng cách xoá dòng.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImport(f);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="btn-primary hover:btn-primary-hover disabled:opacity-50"
          >
            {importing ? 'Đang xử lý...' : '📤 Chọn file .xlsx'}
          </button>
          {importing && (
            <span className="text-sm text-white/60">
              Parse + validate + upsert — có thể mất vài giây với data lớn.
            </span>
          )}
        </div>
      </section>

      {/* ── Result ───────────────────────────── */}
      {result && (
        <section className="card p-6">
          <h2 className="mb-3 text-lg font-semibold text-[var(--color-brand-gold)]">
            Kết quả import
          </h2>
          <div className="space-y-4">
            <SheetResultBlock label="Shikigami" data={result.shikigami} />
            <SheetResultBlock label="Souls" data={result.souls} />
            <SheetResultBlock label="Effects" data={result.effects} />
          </div>
        </section>
      )}

      {/* ── Notes ────────────────────────────── */}
      <section className="card p-6 text-sm text-white/60">
        <h2 className="mb-2 text-sm font-semibold uppercase text-white/40">
          Lưu ý
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Cột <code>id</code> là khoá chính — đừng đổi sau khi record đã
            tồn tại (tạo record mới thì OK).
          </li>
          <li>
            Mảng text (<code>friendly_name</code>, <code>obtain</code>,{' '}
            <code>recommended_souls</code>, <code>countered_by</code>) cách
            nhau bằng dấu <code>{' | '}</code> (pipe có khoảng trắng 2 bên).
          </li>
          <li>
            Cột <code>skills_json</code> / <code>effects_json</code> là JSON
            1 dòng — không xuống dòng. Nếu cảm thấy khó sửa, dùng form thường
            ở trang <a href="/shikigami" className="underline">Thức Thần</a>.
          </li>
          <li>
            Tier hợp lệ: <code>D / C / B / A / S / SS</code> hoặc rỗng. Tier
            khác sẽ bị reset về rỗng.
          </li>
          <li>
            Import là idempotent — chạy lại cùng file = no-op. Không xoá
            record bằng cách xoá dòng (xoá phải qua form chi tiết).
          </li>
        </ul>
      </section>
    </div>
  );
}

function SheetResultBlock({
  label,
  data,
}: {
  label: string;
  data: SheetResult;
}) {
  const hasErrors = data.errors.length > 0;
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{label}</h3>
        <span className="text-sm text-white/60">
          ✓ {data.upserted} upserted
          {hasErrors && (
            <span className="ml-3 text-red-300">
              ⚠ {data.errors.length} lỗi
            </span>
          )}
        </span>
      </div>
      {hasErrors && (
        <details className="mt-3 text-sm" open>
          <summary className="cursor-pointer text-white/60">
            Chi tiết lỗi
          </summary>
          <ul className="mt-2 space-y-1 font-mono text-xs text-red-300">
            {data.errors.slice(0, 50).map((e, i) => (
              <li key={i} className="border-l-2 border-red-500/40 pl-2">
                <span className="text-white/40">
                  row {e.excelRow}
                  {e.id ? ` · ${e.id}` : ''}:
                </span>{' '}
                {e.error}
              </li>
            ))}
            {data.errors.length > 50 && (
              <li className="text-white/40">
                ... và {data.errors.length - 50} lỗi nữa.
              </li>
            )}
          </ul>
        </details>
      )}
    </div>
  );
}
