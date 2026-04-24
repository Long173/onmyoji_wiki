import 'package:flutter_test/flutter_test.dart';
import 'package:onmyoji_wiki/features/shikigami/models/shikigami.dart';

void main() {
  group('Shikigami.fromJson', () {
    test('parses a full record', () {
      final json = {
        'id': 'ibaraki_doji',
        'name_vi': 'Ibaraki Đồng Tử',
        'name_jp': '茨木童子',
        'name_en': 'Ibaraki Doji',
        'rarity': 'SSR',
        'role': ['attacker', 'defender'],
        'description': 'desc',
        'obtain': ['A', 'B'],
        'stats': {
          'hp': {'value': 10122, 'tier': 'A'},
          'attack': {'value': 320, 'tier': 'S'},
          'defense': {'value': 210, 'tier': 'B'},
          'speed': 109, // legacy int form still accepted
          'crit_rate': {'value': 12, 'tier': 'D'},
          'crit_dmg': {'value': 160, 'tier': 'SS'},
          'accuracy': {'value': 0, 'tier': ''},
          'resist': {'value': 0, 'tier': 'C'},
        },
        'skills': [
          {
            'name': 'Liệt Hàn Trảo',
            'description': 'd1',
            'levels': [
              {'level': 1, 'description': 'd1'},
              {'level': 2, 'description': 'd1 +5%'},
            ],
          },
          {'name': 'Huyết Nộ', 'description': 'd2', 'cost': 2},
        ],
        'recommended_souls': ['seductress'],
        'lore': 'lore',
        'image': 'assets/images/shikigami/ibaraki_doji.webp',
      };

      final s = Shikigami.fromJson(json);

      expect(s.id, 'ibaraki_doji');
      expect(s.nameVi, 'Ibaraki Đồng Tử');
      expect(s.rarity, 'SSR');
      expect(s.roles, ['attacker', 'defender']);
      expect(s.hasRole('defender'), isTrue);
      expect(s.hasRole('support'), isFalse);
      expect(s.roleLabel, 'Công · Thủ');
      expect(s.stats.hp.value, 10122);
      expect(s.stats.hp.tier, 'A');
      expect(s.stats.critDmg.value, 160);
      expect(s.stats.critDmg.tier, 'SS');
      // Legacy int form → tier empty
      expect(s.stats.speed.value, 109);
      expect(s.stats.speed.tier, '');
      expect(s.stats.speed.hasTier, isFalse);
      // New stats
      expect(s.stats.resist.tier, 'C');
      expect(s.stats.accuracy.hasTier, isFalse);
      expect(s.skills, hasLength(2));
      expect(s.skills[0].levels, hasLength(2));
      expect(s.skills[0].levels.first.level, 1);
      expect(s.skills[0].resolvedLevels, hasLength(2));
      expect(s.skills[1].cost, 2);
      // Skill without explicit `levels` falls back to Lv1 via resolvedLevels.
      expect(s.skills[1].levels, isEmpty);
      expect(s.skills[1].resolvedLevels, hasLength(1));
      expect(s.skills[1].resolvedLevels.first.level, 1);
      expect(s.recommendedSouls, ['seductress']);
      expect(s.searchableNames, contains('Ibaraki Đồng Tử'));
      expect(s.friendlyNames, isEmpty);
    });

    test('legacy string role still parsed as single-entry list', () {
      final s = Shikigami.fromJson({
        'id': 'x',
        'name_vi': 'Thử',
        'role': 'support',
      });
      expect(s.roles, ['support']);
      expect(s.roleLabel, 'Hỗ trợ');
    });

    test('parses friendly_name and includes them in search tokens', () {
      final s = Shikigami.fromJson({
        'id': 'ibaraki_doji',
        'name_vi': 'Ibaraki Đồng Tử',
        'friendly_name': ['Ibaraki', 'Cụ Oni', ''],
      });
      expect(s.friendlyNames, ['Ibaraki', 'Cụ Oni']);
      expect(s.searchableNames, containsAll(['Ibaraki', 'Cụ Oni']));
    });

    test('applies defaults for missing optional fields', () {
      final s = Shikigami.fromJson({'id': 'x', 'name_vi': 'Thử'});
      expect(s.nameJp, '');
      expect(s.nameEn, '');
      expect(s.friendlyNames, isEmpty);
      expect(s.roles, isEmpty);
      expect(s.rarity, 'N');
      expect(s.obtain, isEmpty);
      expect(s.skills, isEmpty);
      expect(s.stats.hp.value, 0);
      expect(s.stats.hp.tier, '');
      expect(s.recommendedSouls, isEmpty);
    });
  });
}
