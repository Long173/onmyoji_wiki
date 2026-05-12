import Link from 'next/link';

import { ClickableRow } from '@/components/clickable-row';
import { normalize } from '@/lib/picker-utils';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import type { EffectRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;
const KINDS = ['buff', 'debuff', 'other'] as const;

type SearchParams = {
  q?: string;
  kind?: string;
  page?: string;
};

export default async function EffectsListPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { q = '', kind, page: pageRaw = '1' } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = createSupabaseAdmin();
  let query = supabase
    .from('effects')
    .select('id,name,en_name,kind,image,updated_at', { count: 'exact' });

  if (kind && (KINDS as readonly string[]).includes(kind)) {
    query = query.eq('kind', kind);
  }
  if (q.trim()) {
    // Strip diacritics so the term matches the *_unaccent stored values
    // (see shikigami/page.tsx for the full rationale).
    const term = normalize(q.trim());
    query = query.or(
      `name_unaccent.ilike.%${term}%,en_name_unaccent.ilike.%${term}%`,
    );
  }

  const { data, count, error } = await query
    .order('kind')
    .order('sort_index')
    .range(offset, offset + PAGE_SIZE - 1);

  if (error) {
    return (
      <div className="card p-6 text-red-300">
        Lỗi tải dữ liệu: {error.message}
      </div>
    );
  }

  const rows = (data ?? []) as Pick<
    EffectRow,
    'id' | 'name' | 'en_name' | 'kind' | 'image'
  >[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hiệu ứng</h1>
          <p className="text-sm text-white/60">{total} record</p>
        </div>
        <Link
          href="/effects/new"
          className="btn-primary hover:btn-primary-hover"
        >
          + Thêm mới
        </Link>
      </div>

      <form className="card flex flex-wrap gap-3 p-4" action="/effects">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Tìm tên Việt / Anh (không dấu OK)"
          className="input-field flex-1"
        />
        <select
          name="kind"
          defaultValue={kind ?? ''}
          className="input-field max-w-[140px]"
        >
          <option value="">Mọi loại</option>
          <option value="buff">Buff</option>
          <option value="debuff">Debuff</option>
          <option value="other">Khác</option>
        </select>
        <button type="submit" className="btn-primary hover:btn-primary-hover">
          Lọc
        </button>
      </form>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-xs uppercase text-white/60">
            <tr>
              <th className="px-4 py-2">Tên Việt</th>
              <th className="px-4 py-2">Tên Anh</th>
              <th className="px-4 py-2">Loại</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <ClickableRow key={row.id} href={`/effects/${row.id}`}>
                <td className="px-4 py-2">
                  {row.name || <span className="text-white/30">(trống)</span>}
                </td>
                <td className="px-4 py-2 text-white/60">{row.en_name}</td>
                <td className="px-4 py-2">
                  <KindChip kind={row.kind} />
                </td>
              </ClickableRow>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-white/40">
                  Không có record nào khớp bộ lọc.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          baseHref="/effects"
          q={q}
          kind={kind}
        />
      )}
    </div>
  );
}

function KindChip({ kind }: { kind: string }) {
  const map: Record<string, string> = {
    buff: 'bg-emerald-500/20 text-emerald-300',
    debuff: 'bg-red-500/20 text-red-300',
    other: 'bg-white/10 text-white/60',
  };
  const label: Record<string, string> = {
    buff: 'Buff',
    debuff: 'Debuff',
    other: 'Khác',
  };
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-semibold ${map[kind] ?? map.other}`}
    >
      {label[kind] ?? kind}
    </span>
  );
}

function Pagination({
  page,
  totalPages,
  baseHref,
  q,
  kind,
}: {
  page: number;
  totalPages: number;
  baseHref: string;
  q: string;
  kind?: string;
}) {
  const link = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (kind) params.set('kind', kind);
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return qs ? `${baseHref}?${qs}` : baseHref;
  };
  return (
    <div className="flex items-center justify-center gap-2 text-sm">
      {page > 1 && (
        <Link
          href={link(page - 1)}
          className="rounded border border-white/20 px-3 py-1 hover:bg-white/5"
        >
          ← Trước
        </Link>
      )}
      <span className="text-white/60">
        Trang {page} / {totalPages}
      </span>
      {page < totalPages && (
        <Link
          href={link(page + 1)}
          className="rounded border border-white/20 px-3 py-1 hover:bg-white/5"
        >
          Sau →
        </Link>
      )}
    </div>
  );
}
