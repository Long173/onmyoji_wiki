import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:onmyoji_wiki/core/constants/asset_paths.dart';

void main() {
  setUpAll(() {
    dotenv.testLoad(
      fileInput: 'SUPABASE_URL=https://stub.test\nSUPABASE_ANON_KEY=key\n',
    );
  });

  group('AssetPaths.resolveStored', () {
    test('empty input → empty output (skips network attempt)', () {
      expect(AssetPaths.resolveStored(''), '');
    });

    test('full https URL passes through unchanged', () {
      const url = 'https://cdn.example.com/foo.webp';
      expect(AssetPaths.resolveStored(url), url);
    });

    test('legacy assets/images/... resolves against storage base', () {
      expect(
        AssetPaths.resolveStored('assets/images/souls/azure_basan.webp'),
        'https://stub.test/storage/v1/object/public/assets/souls/azure_basan.webp',
      );
    });

    test('bucket-relative path resolves against storage base', () {
      expect(
        AssetPaths.resolveStored('shikigami/ssr/tu_kim_than.webp'),
        'https://stub.test/storage/v1/object/public/assets/shikigami/ssr/tu_kim_than.webp',
      );
    });
  });
}
