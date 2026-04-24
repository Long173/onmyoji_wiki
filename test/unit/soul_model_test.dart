import 'package:flutter_test/flutter_test.dart';
import 'package:onmyoji_wiki/features/soul/models/soul.dart';

void main() {
  group('Soul.fromJson', () {
    test('parses a normal soul with 2/4 pc effects', () {
      final s = Soul.fromJson({
        'id': 'shiranui',
        'name_vi': 'Shiranui',
        'kind': 'normal',
        'effects': [
          {'pieces': 2, 'description': 'Tăng 30% công kích.'},
          {'pieces': 4, 'description': 'Có 50% thêm đòn phụ.'},
        ],
        'image': 'assets/images/souls/shiranui.webp',
      });
      expect(s.id, 'shiranui');
      expect(s.kind, SoulKind.normal);
      expect(s.effects, hasLength(2));
      expect(s.effects.first.pieces, 2);
      expect(s.effects.last.pieces, 4);
      expect(s.primaryEffect!.pieces, 2);
    });

    test('parses a boss soul with 1/2 pc effects', () {
      final s = Soul.fromJson({
        'id': 'boss_x',
        'name_vi': 'Ngự boss X',
        'kind': 'boss',
        'effects': [
          {'pieces': 1, 'description': '1pc effect'},
          {'pieces': 2, 'description': '2pc effect'},
        ],
      });
      expect(s.kind, SoulKind.boss);
      expect(s.kind.expectedPieces, [1, 2]);
      expect(s.effects.map((e) => e.pieces).toList(), [1, 2]);
    });

    test('primaryEffectShort truncates long descriptions', () {
      final s = Soul.fromJson({
        'id': 'x',
        'name_vi': 'X',
        'effects': [
          {'pieces': 2, 'description': 'a' * 100},
        ],
      });
      expect(s.primaryEffectShort.length, lessThan(100));
      expect(s.primaryEffectShort.endsWith('…'), isTrue);
    });

    test('legacy effect_2pc/effect_4pc still parsed', () {
      final s = Soul.fromJson({
        'id': 'legacy',
        'name_vi': 'Legacy',
        'effect_2pc': '2pc desc',
        'effect_4pc': '4pc desc',
      });
      expect(s.kind, SoulKind.normal);
      expect(s.effects, hasLength(2));
      expect(s.effects[0].pieces, 2);
      expect(s.effects[1].pieces, 4);
    });

    test('defaults: kind=normal, empty effects, empty image', () {
      final s = Soul.fromJson({'id': 'y', 'name_vi': 'Y'});
      expect(s.kind, SoulKind.normal);
      expect(s.effects, isEmpty);
      expect(s.primaryEffect, isNull);
      expect(s.primaryEffectShort, '');
    });
  });

  group('SoulKind.fromString', () {
    test('maps boss', () {
      expect(SoulKind.fromString('boss'), SoulKind.boss);
      expect(SoulKind.fromString('BOSS'), SoulKind.boss);
    });
    test('defaults to normal for other values', () {
      expect(SoulKind.fromString('normal'), SoulKind.normal);
      expect(SoulKind.fromString(null), SoulKind.normal);
      expect(SoulKind.fromString('anything'), SoulKind.normal);
    });
  });
}
