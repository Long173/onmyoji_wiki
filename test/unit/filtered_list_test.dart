import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:onmyoji_wiki/core/data/json_loader.dart';
import 'package:onmyoji_wiki/features/shikigami/models/shikigami.dart';
import 'package:onmyoji_wiki/features/shikigami/providers/shikigami_list_provider.dart';
import 'package:onmyoji_wiki/features/shikigami/repositories/shikigami_repository.dart';

class _FakeLoader implements JsonLoader {
  _FakeLoader(this._byPath);
  final Map<String, List<Map<String, dynamic>>> _byPath;

  @override
  Future<List<Map<String, dynamic>>> loadList(String assetPath) async {
    final data = _byPath[assetPath];
    if (data == null) {
      throw Exception('No fixture for $assetPath');
    }
    return data;
  }
}

Shikigami _s(String id, String nameVi,
    {String rarity = 'SSR', String role = 'attacker'}) {
  return Shikigami.fromJson({
    'id': id,
    'name_vi': nameVi,
    'rarity': rarity,
    'role': role,
  });
}

void main() {
  late ProviderContainer container;

  setUp(() {
    container = ProviderContainer(overrides: [
      jsonLoaderProvider.overrideWithValue(_FakeLoader({
        'assets/data/shikigami/ssr.json': [
          {'id': 'ibaraki_doji', 'name_vi': 'Ibaraki Đồng Tử', 'rarity': 'SSR', 'role': 'attacker'},
          {'id': 'mio', 'name_vi': 'Mio', 'rarity': 'SSR', 'role': 'defender'},
        ],
        'assets/data/shikigami/sr.json': [
          {'id': 'momiji', 'name_vi': 'Momiji', 'rarity': 'SR', 'role': 'attacker'},
        ],
        'assets/data/shikigami/sp.json': [],
        'assets/data/shikigami/r.json': [],
        'assets/data/shikigami/n.json': [],
      })),
    ]);
  });

  tearDown(() => container.dispose());

  test('shikigamiListProvider preserves JSON file order', () async {
    final list = await container.read(shikigamiListProvider.future);
    // JSON file order = fixture insertion order: ibaraki_doji, mio, momiji
    expect(list.map((e) => e.id).toList(),
        ['ibaraki_doji', 'mio', 'momiji']);
  });

  test('shikigamiByIdProvider finds the right item', () async {
    final s = await container.read(shikigamiByIdProvider('mio').future);
    expect(s, isNotNull);
    expect(s!.nameVi, 'Mio');
  });

  test('filteredShikigamiProvider applies query, rarity, role', () async {
    await container.read(shikigamiListProvider.future);

    container
        .read(shikigamiFilterProvider.notifier)
        .setRarity('SSR');
    final ssrOnly =
        container.read(filteredShikigamiProvider).value!.map((e) => e.id);
    expect(ssrOnly, containsAll(['ibaraki_doji', 'mio']));
    expect(ssrOnly, isNot(contains('momiji')));

    container
        .read(shikigamiFilterProvider.notifier)
        .setRole('defender');
    final defOnly =
        container.read(filteredShikigamiProvider).value!.map((e) => e.id);
    expect(defOnly, ['mio']);

    container.read(shikigamiFilterProvider.notifier).reset();
    container
        .read(shikigamiFilterProvider.notifier)
        .setQuery('dong tu');
    final searched =
        container.read(filteredShikigamiProvider).value!.map((e) => e.id);
    expect(searched, ['ibaraki_doji']);
  });

  test('repository.loadAll returns mapped Shikigami list', () async {
    final repo = container.read(shikigamiRepositoryProvider);
    final list = await repo.loadAll();
    expect(list, hasLength(3));
    expect(list.first, isA<Shikigami>());
  });

  test('helper _s sanity check (mirrors test fixtures)', () {
    final s = _s('x', 'X');
    expect(s.id, 'x');
  });
}
