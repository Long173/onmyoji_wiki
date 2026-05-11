import 'package:diacritic/diacritic.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:infinite_scroll_pagination/infinite_scroll_pagination.dart';
import 'package:onmyoji_wiki/core/data/remote_data_source.dart';
import 'package:onmyoji_wiki/features/shikigami/models/shikigami.dart';

/// In-process fake — implements the predicates Postgres would apply against
/// an in-memory dataset, including `.range(offset, offset+limit-1)` slicing,
/// so we can drive a real PagingController without standing up Supabase.
class _FakeRemote implements RemoteDataSource {
  _FakeRemote(this._rows);
  final List<Map<String, dynamic>> _rows;
  final calls = <({String? rarity, String? search, int offset, int? limit})>[];

  @override
  Future<List<Map<String, dynamic>>> fetchShikigami({
    String? rarity,
    String? search,
    int offset = 0,
    int? limit,
  }) async {
    calls.add((rarity: rarity, search: search, offset: offset, limit: limit));
    Iterable<Map<String, dynamic>> rows = _rows;
    if (rarity != null && rarity.isNotEmpty) {
      rows = rows.where((r) => r['rarity'] == rarity);
    }
    if (search != null && search.isNotEmpty) {
      final q = removeDiacritics(search).toLowerCase();
      rows = rows.where((r) {
        for (final k in ['name_vi', 'name_en', 'name_jp']) {
          final raw = (r[k] ?? '').toString();
          if (removeDiacritics(raw).toLowerCase().contains(q)) return true;
        }
        return false;
      });
    }
    final all = rows.toList();
    if (limit == null) return all;
    final end = (offset + limit).clamp(0, all.length);
    return all.sublist(offset.clamp(0, all.length), end);
  }

  @override
  Future<List<Map<String, dynamic>>> fetchSouls({
    String? kind,
    String? search,
    int offset = 0,
    int? limit,
  }) =>
      throw UnimplementedError();

  @override
  Future<List<Map<String, dynamic>>> fetchEffects({
    String? kind,
    String? search,
    int offset = 0,
    int? limit,
  }) =>
      throw UnimplementedError();

  @override
  Future<List<Map<String, dynamic>>> fetchManifest() =>
      throw UnimplementedError();

  @override
  Future<Map<String, dynamic>?> fetchShikigamiById(String id) =>
      throw UnimplementedError();

  @override
  Future<Map<String, dynamic>?> fetchSoulById(String id) =>
      throw UnimplementedError();

  @override
  Future<Map<String, dynamic>?> fetchEffectById(String id) =>
      throw UnimplementedError();

  @override
  Future<List<Map<String, dynamic>>> fetchSoulsByIds(List<String> ids) =>
      throw UnimplementedError();
}

PagingController<int, Shikigami> _buildController(
  _FakeRemote remote, {
  required int pageSize,
  String? rarity,
  String search = '',
}) {
  return PagingController<int, Shikigami>(
    getNextPageKey: (state) {
      if (state.pages == null) return 0;
      final lastPage = state.pages!.lastOrNull;
      if (lastPage == null || lastPage.length < pageSize) return null;
      return (state.keys?.lastOrNull ?? 0) + pageSize;
    },
    fetchPage: (offset) async {
      final raw = await remote.fetchShikigami(
        rarity: rarity,
        search: search,
        offset: offset,
        limit: pageSize,
      );
      return raw.map(Shikigami.fromJson).toList();
    },
  );
}

void main() {
  late _FakeRemote remote;

  setUp(() {
    // 5 records → 2 pages of 2, then a partial page of 1.
    remote = _FakeRemote([
      {'id': 'a', 'name_vi': 'Alpha', 'rarity': 'SSR'},
      {'id': 'b', 'name_vi': 'Beta', 'rarity': 'SSR'},
      {'id': 'c', 'name_vi': 'Gamma', 'rarity': 'SR'},
      {'id': 'd', 'name_vi': 'Delta', 'rarity': 'SR'},
      {'id': 'e', 'name_vi': 'Epsilon', 'rarity': 'R'},
    ]);
  });

  test('first page loads with offset=0 and the configured page size',
      () async {
    final controller = _buildController(remote, pageSize: 2);
    addTearDown(controller.dispose);

    controller.fetchNextPage();
    await Future<void>.delayed(Duration.zero);
    await Future<void>.delayed(Duration.zero);

    expect(controller.items?.map((s) => s.id), ['a', 'b']);
    expect(remote.calls.last, (rarity: null, search: '', offset: 0, limit: 2));
  });

  test('subsequent fetchNextPage advances the offset', () async {
    final controller = _buildController(remote, pageSize: 2);
    addTearDown(controller.dispose);

    controller.fetchNextPage();
    await Future<void>.delayed(Duration.zero);
    await Future<void>.delayed(Duration.zero);
    controller.fetchNextPage();
    await Future<void>.delayed(Duration.zero);
    await Future<void>.delayed(Duration.zero);

    expect(controller.items?.map((s) => s.id), ['a', 'b', 'c', 'd']);
    expect(remote.calls.last.offset, 2);
  });

  test('stops when last page is smaller than page size', () async {
    final controller = _buildController(remote, pageSize: 2);
    addTearDown(controller.dispose);

    for (var i = 0; i < 5; i++) {
      controller.fetchNextPage();
      await Future<void>.delayed(Duration.zero);
      await Future<void>.delayed(Duration.zero);
    }

    expect(controller.items?.map((s) => s.id), ['a', 'b', 'c', 'd', 'e']);
    // Final fetch returned 1 row (< page size 2) → no further fetch.
    expect(controller.hasNextPage, isFalse);
  });

  test('search predicate filters before pagination slices', () async {
    final controller =
        _buildController(remote, pageSize: 10, search: 'Alpha');
    addTearDown(controller.dispose);

    controller.fetchNextPage();
    await Future<void>.delayed(Duration.zero);
    await Future<void>.delayed(Duration.zero);

    expect(controller.items?.map((s) => s.id), ['a']);
  });
}
