import Link from 'next/link';

import { ClickableRow } from '@/components/clickable-row';
import { FinishChip } from '@/components/finish-chip';
import { RowEditButton } from '@/components/row-edit-button';
import { RowThumb } from '@/components/row-thumb';
import { normalize } from '@/lib/picker-utils';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { RARITIES, type Rarity, type ShikigamiRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

type SearchParams = {
  q?: string;
  rarity?: string;
  /** Editorial filter: '' = all, 'done', 'pending'. */
  status?: string;
  page?: string;
};

export default async function ShikigamiListPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const {
    q = '',
    rarity,
    status,
    page: pageRaw = '1',
  } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = createSupabaseAdmin();
  let query = supabase
    .from('shikigami')
    .select('id,name_vi,name_en,rarity,image,is_finish,updated_at', {
      count: 'exact',
    });

  if (rarity && (RARITIES as readonly string[]).includes(rarity)) {
    query = query.eq('rarity', rarity);
  }
  if (status === 'done') query = query.eq('is_finish', true);
  if (status === 'pending') query = query.eq('is_finish', false);
  if (q.trim()) {
    // Strip diacritics + lowercase so the term matches the `*_unaccent`
    // generated columns (which store already-unaccented values). Without
    // this, typing "sò" would never match a stored "so".
    const term = normalize(q.trim());
    query = query.or(
      `name_vi_unaccent.ilike.%${term}%,` +
        `name_en_unaccent.ilike.%${term}%,` +
        `friendly_name_unaccent.ilike.%${term}%`,
    );
  }

  const { data, count, error } = await query
    .order('rarity')
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
    ShikigamiRow,
    | 'id'
    | 'name_vi'
    | 'name_en'
    | 'rarity'
    | 'image'
    | 'is_finish'
    | 'updated_at'
  >[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Thức Thần</h1>
          <p className="text-sm text-white/60">{total} record</p>
        </div>
        <Link
          href="/shikigami/new"
          className="btn-primary hover:btn-primary-hover"
        >
          + Thêm mới
        </Link>
      </div>

      <form className="card flex flex-wrap gap-3 p-4" action="/shikigami">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Tìm tên Việt / Anh / biệt danh (không dấu OK)"
          className="input-field flex-1"
        />
        <select
          name="rarity"
          defaultValue={rarity ?? ''}
          className="input-field max-w-[140px]"
        >
          <option value="">Mọi rarity</option>
          {RARITIES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
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
              <th className="px-4 py-2">Rarity</th>
              <th className="px-4 py-2">Trạng thái</th>
              <th className="px-4 py-2">Cập nhật</th>
              <th className="w-12 px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <ClickableRow key={row.id} href={`/shikigami/${row.id}`}>
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
                  <RarityChip rarity={row.rarity as Rarity} />
                </td>
                <td className="px-4 py-2">
                  <FinishChip done={row.is_finish} />
                </td>
                <td className="px-4 py-2 text-xs text-white/40">
                  {row.updated_at?.slice(0, 10)}
                </td>
                <td className="px-2 py-2 text-right">
                  <RowEditButton href={`/shikigami/${row.id}/edit`} />
                </td>
              </ClickableRow>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-white/40"
                >
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
          baseHref="/shikigami"
          q={q}
          rarity={rarity}
          status={status}
        />
      )}
    </div>
  );
}

function RarityChip({ rarity }: { rarity: Rarity }) {
  const colors: Record<Rarity, string> = {
    SSR: 'bg-amber-500/20 text-amber-300',
    SP: 'bg-fuchsia-500/20 text-fuchsia-300',
    SR: 'bg-violet-500/20 text-violet-300',
    R: 'bg-sky-500/20 text-sky-300',
    N: 'bg-white/10 text-white/60',
  };
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-semibold ${colors[rarity]}`}
    >
      {rarity}
    </span>
  );
}

function Pagination({
  page,
  totalPages,
  baseHref,
  q,
  rarity,
  status,
}: {
  page: number;
  totalPages: number;
  baseHref: string;
  q: string;
  rarity?: string;
  status?: string;
}) {
  const link = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (rarity) params.set('rarity', rarity);
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
