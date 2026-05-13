import Link from 'next/link';

import { ClickableRow } from '@/components/clickable-row';
import { FinishChip } from '@/components/finish-chip';
import { RowEditButton } from '@/components/row-edit-button';
import { RowThumb } from '@/components/row-thumb';
import { normalize } from '@/lib/picker-utils';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import type { SoulRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;
const KINDS = ['normal', 'boss'] as const;

type SearchParams = {
  q?: string;
  kind?: string;
  status?: string;
  page?: string;
};

export default async function SoulsListPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const {
    q = '',
    kind,
    status,
    page: pageRaw = '1',
  } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = createSupabaseAdmin();
  let query = supabase
    .from('souls')
    .select('id,name_vi,name_en,kind,image,is_finish,updated_at', {
      count: 'exact',
    });

  if (kind && (KINDS as readonly string[]).includes(kind)) {
    query = query.eq('kind', kind);
  }
  if (status === 'done') query = query.eq('is_finish', true);
  if (status === 'pending') query = query.eq('is_finish', false);
  if (q.trim()) {
    // Strip diacritics so the term matches the *_unaccent stored values
    // (see shikigami/page.tsx for the full rationale).
    const term = normalize(q.trim());
    query = query.or(
      `name_vi_unaccent.ilike.%${term}%,name_en_unaccent.ilike.%${term}%`,
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
    SoulRow,
    'id' | 'name_vi' | 'name_en' | 'kind' | 'image' | 'is_finish'
  >[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ngự hồn</h1>
          <p className="text-sm text-white/60">{total} record</p>
        </div>
        <Link href="/souls/new" className="btn-primary hover:btn-primary-hover">
          + Thêm mới
        </Link>
      </div>

      <form className="card flex flex-wrap gap-3 p-4" action="/souls">
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
          <option value="normal">Ngự thường</option>
          <option value="boss">Ngự boss</option>
        </select>
        <select
          name="status"
          defaultValue={status ?? ''}
          className="input-field max-w-[160px]"
        >
          <option value="">Mọi trạng thái</option>
          <option value="pending">Chưa hoàn thành</option>
          <option value="done">Đã hoàn thành</option>
        </select>
        <button type="submit" className="btn-primary hover:btn-primary-hover">
          Lọc
        </button>
      </form>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-xs uppercase text-white/60">
            <tr>
              <th className="w-14 px-4 py-2"></th>
              <th className="px-4 py-2">Tên Việt</th>
              <th className="px-4 py-2">Tên Anh</th>
              <th className="px-4 py-2">Loại</th>
              <th className="px-4 py-2">Trạng thái</th>
              <th className="w-20 px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <ClickableRow key={row.id} href={`/souls/${row.id}`}>
                <td className="py-2 pl-4 pr-0">
                  <RowThumb
                    path={row.image}
                    alt={row.name_vi || row.name_en || row.id}
                  />
                </td>
                <td className="px-4 py-2">
                  {row.name_vi || (
                    <span className="text-white/30">(trống)</span>
                  )}
                </td>
                <td className="px-4 py-2 text-white/60">{row.name_en}</td>
                <td className="px-4 py-2">
                  <KindChip kind={row.kind} />
                </td>
                <td className="px-4 py-2">
                  <FinishChip done={row.is_finish} />
                </td>
                <td className="px-4 py-2 text-right">
                  <RowEditButton href={`/souls/${row.id}/edit`} />
                </td>
              </ClickableRow>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-white/40">
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
          baseHref="/souls"
          q={q}
          kind={kind}
          status={status}
        />
      )}
    </div>
  );
}

function KindChip({ kind }: { kind: string }) {
  const color =
    kind === 'boss'
      ? 'bg-red-500/20 text-red-300'
      : 'bg-amber-500/20 text-amber-300';
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${color}`}>
      {kind === 'boss' ? 'Ngự boss' : 'Ngự thường'}
    </span>
  );
}

function Pagination({
  page,
  totalPages,
  baseHref,
  q,
  kind,
  status,
}: {
  page: number;
  totalPages: number;
  baseHref: string;
  q: string;
  kind?: string;
  status?: string;
}) {
  const link = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (kind) params.set('kind', kind);
    if (status) params.set('status', status);
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
