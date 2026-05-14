import 'package:diacritic/diacritic.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../logging/api_logger.dart';

/// Thin wrapper around the Supabase Postgres REST client for the wiki
/// collections. Returns plain `Map<String, dynamic>` rows so the existing
/// `*.fromJson` factories keep working unchanged.
///
/// Filter args (`rarity`/`kind`/`search`) translate to Postgres predicates:
///   - rarity/kind  → `.eq(column, value)`
///   - search       → `.or('col_unaccent.ilike.%q%,...')` on the generated
///                    unaccent columns added in migration 0004
///
/// Pagination (`offset`/`limit`) maps to PostgREST `.range(from, to)` which
/// translates to a SQL `OFFSET / LIMIT` pair under the hood. Caller is
/// responsible for tracking whether the previous page was full to know when
/// to stop (see `infinite_scroll_pagination` integration in the screens).
class RemoteDataSource {
  RemoteDataSource(this._client);

  final SupabaseClient _client;

  Future<List<Map<String, dynamic>>> fetchShikigami({
    String? rarity,
    String? search,
    int offset = 0,
    int? limit,
  }) {
    return _selectFiltered(
      table: 'shikigami',
      orderColumns: const ['rarity', 'sort_index'],
      eqFilters: {if (rarity != null && rarity.isNotEmpty) 'rarity': rarity},
      searchColumns: const [
        'name_vi_unaccent',
        'name_en_unaccent',
        'friendly_name_unaccent',
      ],
      search: search,
      offset: offset,
      limit: limit,
    );
  }

  Future<List<Map<String, dynamic>>> fetchSouls({
    String? kind,
    String? search,
    int offset = 0,
    int? limit,
  }) {
    return _selectFiltered(
      table: 'souls',
      orderColumns: const ['kind', 'sort_index'],
      eqFilters: {if (kind != null && kind.isNotEmpty) 'kind': kind},
      searchColumns: const ['name_vi_unaccent', 'name_en_unaccent'],
      search: search,
      offset: offset,
      limit: limit,
    );
  }

  Future<List<Map<String, dynamic>>> fetchEffects({
    String? kind,
    String? search,
    int offset = 0,
    int? limit,
  }) {
    return _selectFiltered(
      table: 'effects',
      orderColumns: const ['kind', 'sort_index'],
      eqFilters: {if (kind != null && kind.isNotEmpty) 'kind': kind},
      searchColumns: const ['name_unaccent', 'en_name_unaccent'],
      search: search,
      offset: offset,
      limit: limit,
    );
  }

  Future<List<Map<String, dynamic>>> fetchManifest() => _selectFiltered(
        table: 'manifest',
        orderColumns: const ['collection'],
      );

  Future<Map<String, dynamic>?> fetchShikigamiById(String id) =>
      _selectById(table: 'shikigami', id: id);

  Future<Map<String, dynamic>?> fetchSoulById(String id) =>
      _selectById(table: 'souls', id: id);

  Future<Map<String, dynamic>?> fetchEffectById(String id) =>
      _selectById(table: 'effects', id: id);

  /// Bulk by-id fetch — used by the shikigami detail screen to resolve the
  /// `recommended_souls` list in one round-trip instead of N.
  Future<List<Map<String, dynamic>>> fetchSoulsByIds(List<String> ids) =>
      _selectByIds(table: 'souls', ids: ids);

  Future<Map<String, dynamic>?> _selectById({
    required String table,
    required String id,
  }) async {
    final sw = ApiLogger.start(table, extra: {'eq.id': id});
    try {
      final row =
          await _client.from(table).select().eq('id', id).maybeSingle();
      final result = row == null ? null : Map<String, dynamic>.from(row);
      ApiLogger.success(sw, table, rowCount: result == null ? 0 : 1);
      return result;
    } catch (e, st) {
      ApiLogger.failure(sw, table, e, stackTrace: st);
      rethrow;
    }
  }

  Future<List<Map<String, dynamic>>> _selectByIds({
    required String table,
    required List<String> ids,
  }) async {
    if (ids.isEmpty) return const [];
    final sw = ApiLogger.start(table, extra: {'in.id': '${ids.length}'});
    try {
      final rows = await _client.from(table).select().inFilter('id', ids);
      final result = rows
          .map((r) => Map<String, dynamic>.from(r as Map))
          .toList(growable: false);
      ApiLogger.success(sw, table, rowCount: result.length);
      return result;
    } catch (e, st) {
      ApiLogger.failure(sw, table, e, stackTrace: st);
      rethrow;
    }
  }

  Future<List<Map<String, dynamic>>> _selectFiltered({
    required String table,
    required List<String> orderColumns,
    Map<String, String> eqFilters = const {},
    List<String> searchColumns = const [],
    String? search,
    int offset = 0,
    int? limit,
  }) async {
    final normalizedSearch =
        (search ?? '').trim().isEmpty ? null : _normalizeSearch(search!);

    final sw = ApiLogger.start(
      table,
      extra: {
        for (final e in eqFilters.entries) 'eq.${e.key}': e.value,
        'search': ?normalizedSearch,
        if (limit != null) 'range': '$offset..${offset + limit - 1}',
      },
    );
    try {
      PostgrestFilterBuilder<List<Map<String, dynamic>>> filter =
          _client.from(table).select();

      for (final e in eqFilters.entries) {
        filter = filter.eq(e.key, e.value);
      }
      if (normalizedSearch != null && searchColumns.isNotEmpty) {
        // PostgREST `or()` separator is `,` — strip commas defensively even
        // though Vietnamese names don't contain them.
        final safe = normalizedSearch.replaceAll(',', ' ');
        final clauses = [
          for (final col in searchColumns) '$col.ilike.%$safe%',
        ].join(',');
        filter = filter.or(clauses);
      }

      PostgrestTransformBuilder<List<Map<String, dynamic>>>? ordered;
      for (final col in orderColumns) {
        ordered = (ordered ?? filter).order(col, ascending: true);
      }
      ordered ??= filter;
      if (limit != null) {
        // PostgREST `.range(from, to)` is inclusive on both ends.
        ordered = ordered.range(offset, offset + limit - 1);
      }
      final rows = await ordered;

      final result = rows
          .map((row) => Map<String, dynamic>.from(row as Map))
          .toList(growable: false);
      ApiLogger.success(sw, table, rowCount: result.length);
      return result;
    } catch (e, st) {
      ApiLogger.failure(sw, table, e, stackTrace: st);
      rethrow;
    }
  }

  /// Strip diacritics + lowercase to match the canonical form stored in
  /// generated unaccent columns.
  static String _normalizeSearch(String q) =>
      removeDiacritics(q).toLowerCase();
}

final supabaseClientProvider = Provider<SupabaseClient>((ref) {
  return Supabase.instance.client;
});

final remoteDataSourceProvider = Provider<RemoteDataSource>((ref) {
  return RemoteDataSource(ref.watch(supabaseClientProvider));
});
