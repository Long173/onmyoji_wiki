import 'package:flutter_test/flutter_test.dart';
import 'package:onmyoji_wiki/core/utils/search_utils.dart';

void main() {
  group('normalizeForSearch', () {
    test('removes Vietnamese diacritics and lowercases', () {
      expect(normalizeForSearch('Ibaraki Đồng Tử'),
          'ibaraki dong tu');
      expect(normalizeForSearch('Tỳ Bà'), 'ty ba');
      expect(normalizeForSearch('  Seimei  '), 'seimei');
    });

    test('keeps ASCII unchanged (except lowercase)', () {
      expect(normalizeForSearch('SEIMEI'), 'seimei');
    });
  });

  group('matchesQuery', () {
    test('empty query matches anything', () {
      expect(matchesQuery('', ['anything']), isTrue);
      expect(matchesQuery('   ', ['anything']), isTrue);
    });

    test('matches diacritic-insensitive and case-insensitive', () {
      final haystacks = ['Ibaraki Đồng Tử', 'Ibaraki Doji', 'ibaraki_doji'];
      expect(matchesQuery('ibaraki dong tu', haystacks), isTrue);
      expect(matchesQuery('Ibaraki ĐỒNG', haystacks), isTrue);
      expect(matchesQuery('doji', haystacks), isTrue);
    });

    test('returns false when no haystack contains query', () {
      expect(matchesQuery('mystery', ['Seimei', 'Kagura']), isFalse);
    });
  });
}
