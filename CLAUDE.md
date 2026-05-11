# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Vietnamese-language wiki for the **Onmyoji** mobile game (NetEase). Flutter app, Android + iOS, backed by **Supabase** (Postgres + Storage). No Firebase.

**Read `HANDOFF.md` first** — it is the canonical record of schema, data sources, conventions, and open work items. This file is a quick orientation; HANDOFF.md is the source of truth.

The Supabase migration replaced the previous bundled-assets architecture; old references to `assets/data/` and `assets/images/` in the codebase are transitional (still read by `tools/migrate/upload_to_supabase.py` for one-shot upload, but no longer bundled into the app).

## Commands

```bash
flutter pub get
flutter run                           # device picker; first launch needs network
flutter analyze                       # must stay clean
flutter test                          # 38 tests, all must pass
flutter test test/unit/<file>.dart    # single file
flutter test --coverage
```

Python tooling (`tools/`):
```bash
# Migration uploader (Supabase service_role key required — see tools/migrate/README.md)
cd tools/migrate && source .venv/bin/activate
python upload_to_supabase.py --dry-run
python upload_to_supabase.py --only data|images|manifest|all

# Scrapers (source-of-truth ingestion, write back to assets/data/*.json)
cd tools/scraper && source .venv/bin/activate
python scrape_shikigami.py --rarity SSR
python enrich_shikigami_fandom.py --no-create-new && python merge_unmapped.py [--apply]
python -m unittest test_text_cleaner test_preserve
```

## Architecture

### Boot flow (`lib/main.dart` → `BootGate` → `OnmyojiWikiApp`)

1. `Env.load()` reads `.env` (asset-bundled), validates `SUPABASE_URL` + `SUPABASE_ANON_KEY` — fails fast if missing.
2. `Supabase.initialize(...)` boots the SDK.
3. `BootGate` watches `bootSyncProvider` which runs `DataSyncService.sync()`:
   - Fetches `manifest` table from Supabase.
   - For each collection (`shikigami` / `souls` / `effects`), compares server `version` to the locally cached manifest snapshot.
   - Re-downloads any stale collection, writes JSON atomically to `<applicationSupport>/data_cache/<collection>.json`.
   - Updates local manifest snapshot.
4. On success → swap to `OnmyojiWikiApp` (go_router shell). On error → `BootScreen` with retry button (invalidates the provider).

After first launch the sync is a near-no-op (single manifest GET) and resolves instantly when versions match.

### Data layer (Riverpod, no codegen, no freezed)

```
screens/  →  providers/ (StateNotifier)  →  repositories/  →  JsonLoader (cache file reader)
                                                                  ↑
                                                          written by DataSyncService
                                                                  ↑
                                                          RemoteDataSource (Supabase REST)
```

- `lib/core/data/json_loader.dart` — abstract `JsonLoader.loadList(cacheKey)`. Production impl `FileJsonLoader` reads `<applicationSupport>/data_cache/<key>.json`. Tests inject fakes via `jsonLoaderProvider`.
- `lib/core/data/remote_data_source.dart` — wraps `Supabase.instance.client.from(table).select().order(...)`. Returns plain `List<Map<String, dynamic>>` so `*.fromJson` factories work unchanged.
- `lib/core/data/data_sync_service.dart` — orchestrates manifest comparison + atomic writes. Throws `CacheMissException` if a collection is read before sync completes.

Cache keys: `'shikigami'`, `'souls'`, `'effects'`, `'manifest'`. **One file per collection** — the old per-rarity split is gone. Server returns shikigami pre-ordered by `(rarity asc, sort_index asc)`; providers must not re-sort.

### Image layer

- `lib/core/constants/asset_paths.dart` — builders return Supabase Storage public CDN URLs (`{SUPABASE_URL}/storage/v1/object/public/assets/<key>`). `AssetPaths.resolveStored(...)` normalises legacy `assets/images/...` paths, bucket-relative keys, or full URLs.
- `lib/core/widgets/network_image_placeholder.dart` — wraps `cached_network_image` with gradient-+-initials fallback. **Always use this widget** for content images; never call `Image.network` directly.
- `lib/core/widgets/rarity_badge.dart` — same pattern (CachedNetworkImage + text-chip fallback).

### Cross-cutting modules in `lib/core/`

- `config/env.dart` — typed `.env` access (`Env.supabaseUrl`, `Env.supabaseAnonKey`, `Env.storagePublicBase`). Required keys validated at load time.
- `storage/prefs_service.dart` — exposes `sharedPreferencesProvider`, **overridden in `main.dart`** with an awaited instance so providers can read synchronously. Tests override the same provider.
- `utils/search_utils.dart` — `normalizeForSearch()` strips Vietnamese diacritics via `package:diacritic`. All search goes through `matchesQuery()`; never compare raw strings. Indexed fields: `name_vi`, `name_jp`, `name_en`, `friendly_name`.
- `theme/` — `AppBarTheme` is globally transparent so `SliverAppBar.FlexibleSpace` images expand fully. Detail screens must therefore set `backgroundColor + surfaceTintColor + foregroundColor` on their `SliverAppBar` from `scheme.surface`.

### Data schema gotchas

- Shikigami `stats` is a map of `{value, tier}` objects. Render the D/C/B/A/S/SS tier badge **only** for hp/attack/defense/speed/crit_rate. `crit_dmg` defaults to `150` and has no tier; `accuracy`/`resist` also render without tier.
- Skills carry `levels: [{level, description}]` (max Lv5). UI shows Lv1 inline and chips to swap in higher levels.
- `role` is a `List<String>` (multi-role allowed) — never treat as scalar. The DB column is `text[]`.
- Souls intentionally have **no** `recommended_for`, `name_jp`, or `grade` — those were removed; don't re-add (DB schema doesn't have them either).
- Soul grid uses `childAspectRatio: 0.56` (vs `0.62` for shikigami) because cards show `name_en` + 2-line effect preview. Keep this ratio when adding new soul widgets.

## Supabase

Schema lives in `supabase/migrations/`:
- `0001_init.sql` — 4 tables (`shikigami`, `souls`, `effects`, `manifest`), GIN/trgm indexes, `updated_at` triggers.
- `0002_rls.sql` — public read-only for `anon`/`authenticated`. Writes use `service_role` (RLS-bypassing).
- `0003_storage.sql` — bucket `assets` (public read) + storage policies.

Setup walkthrough: `docs/SUPABASE_SETUP.md`. Migration uploader: `tools/migrate/upload_to_supabase.py` (uses `service_role` key — **never** bundled in the app).

## Conventions

- Dark theme forced (`themeMode: ThemeMode.dark` in `app.dart`). Light theme exists but isn't user-selectable; keep both in sync.
- Locale forced to `vi`; English copy lives only in the data layer (`name_en`).
- `ScreenUtilInit` design size is `390 × 844`. Use `.sp`/`.w`/`.h` from `flutter_screenutil`; mixing raw `double` constants breaks tablet responsiveness.
- **No** `bloc`, `freezed`, `json_serializable`, `dio`, or `firebase`. The added server dependencies (`supabase_flutter`, `cached_network_image`, `flutter_dotenv`, `path_provider`, `http`) are the full set.
- `.env` is gitignored; only `.env.example` is committed.
- The Python migration uploader has its own `.env` at `tools/migrate/.env` (also gitignored) — holds the `service_role` key separately from the app.

## Scraper preserve policy (still applies)

`tools/scraper/` writes back to local JSON files under `assets/data/`. The migration uploader then pushes those JSON files to Supabase. The scrapers are **idempotent and non-destructive**:
- `friendly_name`, `role`, non-default `stats`, and `skills[i].image` are preserved verbatim.
- `enrich_shikigami_fandom.py` only fills empty/default fields; unmatched rows go to `unmapped_fandom.json` for manual review.
- `test_preserve.py` guards this contract.

The data flow is now: **scraper → local JSON → migration uploader → Supabase**. JSON files in `assets/data/` are the editable canonical record; the database is a deployment artefact.
