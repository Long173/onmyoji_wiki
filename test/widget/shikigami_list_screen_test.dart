import 'package:diacritic/diacritic.dart';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:onmyoji_wiki/core/data/remote_data_source.dart';
import 'package:onmyoji_wiki/core/storage/prefs_service.dart';
import 'package:onmyoji_wiki/features/shikigami/screens/shikigami_list_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _FakeRemote implements RemoteDataSource {
  _FakeRemote(this._rows);
  final List<Map<String, dynamic>> _rows;

  @override
  Future<List<Map<String, dynamic>>> fetchShikigami({
    String? rarity,
    String? search,
    int offset = 0,
    int? limit,
  }) async {
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

Future<Widget> _harness() async {
  SharedPreferences.setMockInitialValues({});
  final prefs = await SharedPreferences.getInstance();
  return ProviderScope(
    overrides: [
      sharedPreferencesProvider.overrideWithValue(prefs),
      remoteDataSourceProvider.overrideWithValue(_FakeRemote([
        {
          'id': 'ibaraki_doji',
          'name_vi': 'Ibaraki Đồng Tử',
          'rarity': 'SSR',
          'role': 'attacker',
        },
        {
          'id': 'mio',
          'name_vi': 'Mio',
          'rarity': 'SSR',
          'role': 'defender',
        },
      ])),
    ],
    child: ScreenUtilInit(
      designSize: const Size(390, 844),
      builder: (_, _) => const MaterialApp(home: ShikigamiListScreen()),
    ),
  );
}

void main() {
  setUpAll(() {
    dotenv.testLoad(fileInput: 'SUPABASE_URL=https://stub.test\n'
        'SUPABASE_ANON_KEY=stub-key\n');
  });

  testWidgets('renders first page of shikigami', (tester) async {
    await tester.pumpWidget(await _harness());
    await tester.pumpAndSettle();

    expect(find.text('Ibaraki Đồng Tử'), findsOneWidget);
    expect(find.text('Mio'), findsOneWidget);
  });

  testWidgets('search refreshes paging diacritic-insensitively after debounce',
      (tester) async {
    await tester.pumpWidget(await _harness());
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), 'dong tu');
    // Wait past the 400ms debounce window so server fetch fires.
    await tester.pump(const Duration(milliseconds: 450));
    await tester.pumpAndSettle();

    expect(find.text('Ibaraki Đồng Tử'), findsOneWidget);
    expect(find.text('Mio'), findsNothing);
  });

  testWidgets('empty-state shown when no results', (tester) async {
    await tester.pumpWidget(await _harness());
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), 'nonexistent');
    await tester.pump(const Duration(milliseconds: 450));
    await tester.pumpAndSettle();

    expect(find.textContaining('Không tìm thấy'), findsOneWidget);
  });
}
