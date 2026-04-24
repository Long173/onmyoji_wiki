import 'package:flutter_test/flutter_test.dart';
import 'package:onmyoji_wiki/features/effect/models/effect.dart';

void main() {
  group('Effect.fromJson', () {
    test('parses a full record (buff)', () {
      final e = Effect.fromJson({
        'id': 'thoi_huy',
        'name': 'Thời Huy',
        'en_name': 'Time Glory',
        'description': 'Buff tăng tốc hành động...',
        'image': 'assets/images/effects/thoi_huy.webp',
        'kind': 'buff',
      });
      expect(e.id, 'thoi_huy');
      expect(e.enName, 'Time Glory');
      expect(e.kind, EffectKind.buff);
      expect(e.isDebuff, isFalse);
      expect(e.isOther, isFalse);
      expect(e.searchableNames, containsAll(['Thời Huy', 'Time Glory']));
    });

    test('applies defaults when optional fields missing', () {
      final e = Effect.fromJson({'id': 'x'});
      expect(e.name, '');
      expect(e.enName, '');
      expect(e.description, '');
      expect(e.kind, EffectKind.buff);
    });

    test('debuff kind', () {
      final e = Effect.fromJson({'id': 'phong_an', 'kind': 'debuff'});
      expect(e.isDebuff, isTrue);
      expect(e.kind, EffectKind.debuff);
    });

    test('other kind — máu xám example', () {
      final e = Effect.fromJson({
        'id': 'mau_xam',
        'name': 'Máu Xám',
        'en_name': '',
        'description': 'Được coi là máu...',
        'image': '',
        'kind': 'other',
      });
      expect(e.isOther, isTrue);
      expect(e.kind, EffectKind.other);
      expect(e.enName, '');
      expect(e.searchableNames, contains('Máu Xám'));
      expect(e.searchableNames, isNot(contains('')));
    });

    test('unknown kind value falls back to buff', () {
      final e = Effect.fromJson({'id': 'y', 'kind': 'unknown_kind'});
      expect(e.kind, EffectKind.buff);
    });

    test('toJson roundtrip preserves all fields', () {
      final e = Effect(
        id: 'mau_xam',
        name: 'Máu Xám',
        enName: 'Gray HP',
        description: 'desc',
        image: '',
        kind: EffectKind.other,
      );
      final j = e.toJson();
      expect(j['kind'], 'other');
      expect(j['en_name'], 'Gray HP');
      final parsed = Effect.fromJson(j);
      expect(parsed.kind, EffectKind.other);
      expect(parsed.enName, 'Gray HP');
    });
  });
}
