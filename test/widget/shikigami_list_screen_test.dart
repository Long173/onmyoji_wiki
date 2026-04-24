import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:onmyoji_wiki/core/data/json_loader.dart';
import 'package:onmyoji_wiki/core/storage/prefs_service.dart';
import 'package:onmyoji_wiki/features/shikigami/providers/shikigami_list_provider.dart';
import 'package:onmyoji_wiki/features/shikigami/screens/shikigami_list_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _FakeLoader implements JsonLoader {
  _FakeLoader(this._byPath);
  final Map<String, List<Map<String, dynamic>>> _byPath;

  @override
  Future<List<Map<String, dynamic>>> loadList(String assetPath) async {
    return _byPath[assetPath] ?? const [];
  }
}

Future<Widget> _harness() async {
  SharedPreferences.setMockInitialValues({});
  final prefs = await SharedPreferences.getInstance();
  return ProviderScope(
    overrides: [
      sharedPreferencesProvider.overrideWithValue(prefs),
      jsonLoaderProvider.overrideWithValue(_FakeLoader({
        'assets/data/shikigami/ssr.json': [
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
        ],
      })),
    ],
    child: ScreenUtilInit(
      designSize: const Size(390, 844),
      builder: (_, _) => const MaterialApp(home: ShikigamiListScreen()),
    ),
  );
}

void main() {
  testWidgets('renders loaded shikigami in grid', (tester) async {
    await tester.pumpWidget(await _harness());
    await tester.pumpAndSettle();

    expect(find.text('Ibaraki Đồng Tử'), findsOneWidget);
    expect(find.text('Mio'), findsOneWidget);
  });

  testWidgets('search filters list diacritic-insensitively',
      (tester) async {
    await tester.pumpWidget(await _harness());
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), 'dong tu');
    await tester.pumpAndSettle();

    expect(find.text('Ibaraki Đồng Tử'), findsOneWidget);
    expect(find.text('Mio'), findsNothing);
  });

  testWidgets('empty-state shown when no results', (tester) async {
    await tester.pumpWidget(await _harness());
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), 'nonexistent');
    await tester.pumpAndSettle();

    expect(find.textContaining('Không tìm thấy'), findsOneWidget);
  });

  testWidgets('provider layer exposes loaded list', (tester) async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final container = ProviderContainer(overrides: [
      sharedPreferencesProvider.overrideWithValue(prefs),
      jsonLoaderProvider.overrideWithValue(_FakeLoader({
        'assets/data/shikigami/ssr.json': [
          {'id': 'x', 'name_vi': 'X', 'rarity': 'SSR', 'role': 'attacker'},
        ],
      })),
    ]);
    addTearDown(container.dispose);
    final list = await container.read(shikigamiListProvider.future);
    expect(list, hasLength(1));
  });
}
