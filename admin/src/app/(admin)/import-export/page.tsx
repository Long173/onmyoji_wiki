import { ImportExportPanel } from './import-export-panel';

export const dynamic = 'force-dynamic';

export default function ImportExportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Import / Export Excel</h1>
        <p className="mt-1 text-sm text-white/60">
          Tải toàn bộ data về .xlsx, sửa hàng loạt, upload lại để upsert.
        </p>
      </div>
      <ImportExportPanel />
    </div>
  );
}
