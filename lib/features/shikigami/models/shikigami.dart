import 'package:flutter/foundation.dart';

import 'skill.dart';

/// Bậc đánh giá stat — thấp nhất `D`, cao nhất `SS`.
/// Các giá trị khác = `""` (chưa đánh giá).
const List<String> kStatTiers = ['D', 'C', 'B', 'A', 'S', 'SS'];

@immutable
class StatValue {
  const StatValue({required this.value, required this.tier});

  final int value;

  /// Một trong `kStatTiers` hoặc rỗng nếu chưa đánh giá.
  final String tier;

  bool get hasTier => tier.isNotEmpty;

  factory StatValue.fromJson(dynamic raw) {
    // Tương thích legacy: stat là int
    if (raw is num) {
      return StatValue(value: raw.toInt(), tier: '');
    }
    if (raw is Map) {
      final m = Map<String, dynamic>.from(raw);
      final v = m['value'];
      return StatValue(
        value: v is num ? v.toInt() : 0,
        tier: (m['tier'] as String? ?? '').toUpperCase(),
      );
    }
    return const StatValue(value: 0, tier: '');
  }

  Map<String, dynamic> toJson() => {'value': value, 'tier': tier};
}

@immutable
class ShikigamiStats {
  const ShikigamiStats({
    required this.hp,
    required this.attack,
    required this.defense,
    required this.speed,
    required this.critRate,
    required this.critDmg,
    required this.accuracy,
    required this.resist,
  });

  final StatValue hp;
  final StatValue attack;
  final StatValue defense;
  final StatValue speed;
  final StatValue critRate;
  final StatValue critDmg;
  final StatValue accuracy;
  final StatValue resist;

  static const empty = ShikigamiStats(
    hp: StatValue(value: 0, tier: ''),
    attack: StatValue(value: 0, tier: ''),
    defense: StatValue(value: 0, tier: ''),
    speed: StatValue(value: 0, tier: ''),
    critRate: StatValue(value: 0, tier: ''),
    critDmg: StatValue(value: 150, tier: ''),
    accuracy: StatValue(value: 0, tier: ''),
    resist: StatValue(value: 0, tier: ''),
  );

  factory ShikigamiStats.fromJson(Map<String, dynamic> json) {
    return ShikigamiStats(
      hp: StatValue.fromJson(json['hp']),
      attack: StatValue.fromJson(json['attack']),
      defense: StatValue.fromJson(json['defense']),
      speed: StatValue.fromJson(json['speed']),
      critRate: StatValue.fromJson(json['crit_rate']),
      critDmg: StatValue.fromJson(json['crit_dmg']),
      accuracy: StatValue.fromJson(json['accuracy']),
      resist: StatValue.fromJson(json['resist']),
    );
  }
}

/// Allowed soul-slot numbers that have a main-stat choice (the in-game
/// "vị trí 2/4/6"; positions 1/3/5 are fixed at ATK/DEF/HP).
const List<String> kSlotNumbers = ['2', '4', '6'];

/// Short English labels for soul-slot main-stat keys — same set used by the
/// admin web so the UI is consistent across surfaces.
const Map<String, String> kMainStatLabels = {
  'atk_pct': 'ATK%',
  'spd': 'SPD',
  'def_pct': 'DEF%',
  'hp_pct': 'HP%',
  'acc_pct': 'ACC%',
  'res_pct': 'RES%',
  'crit_pct': 'CRIT%',
  'crit_dmg_pct': 'CRITDMG%',
};

@immutable
class Shikigami {
  const Shikigami({
    required this.id,
    required this.nameVi,
    required this.nameJp,
    required this.nameEn,
    required this.friendlyNames,
    required this.rarity,
    required this.description,
    required this.obtain,
    required this.stats,
    required this.skills,
    required this.recommendedSouls,
    required this.slotMains,
    required this.lore,
    required this.image,
  });

  final String id;
  final String nameVi;
  final String nameJp;
  final String nameEn;

  /// Biệt danh do cộng đồng VN đặt (ví dụ "Ngưu Không", "Ba Tháng"...).
  /// User bổ sung tay; có thể rỗng.
  final List<String> friendlyNames;

  final String rarity;
  final String description;
  final List<String> obtain;
  final ShikigamiStats stats;
  final List<Skill> skills;
  final List<String> recommendedSouls;

  /// Main-stat recommendations per choice slot. Keys are `'2'` / `'4'` / `'6'`;
  /// each value is the list of stat-key strings the admin marked as desirable
  /// for that slot. Empty list = "no recommendation" for that slot.
  final Map<String, List<String>> slotMains;

  final String lore;
  final String image;

  /// Display name: prefer Vietnamese, fall back to English, then Japanese,
  /// then the id. Mirrors `Soul.displayName` / `Effect.displayName`.
  String get displayName {
    if (nameVi.isNotEmpty) return nameVi;
    if (nameEn.isNotEmpty) return nameEn;
    if (nameJp.isNotEmpty) return nameJp;
    return id;
  }

  Iterable<String> get searchableNames => [
    nameVi,
    nameEn,
    nameJp,
    id,
    ...friendlyNames,
  ];

  factory Shikigami.fromJson(Map<String, dynamic> json) {
    final stats = json['stats'];
    final skills = (json['skills'] as List? ?? const [])
        .map((e) => Skill.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList(growable: false);
    final friendly = (json['friendly_name'] as List? ?? const [])
        .map((e) => e.toString())
        .where((s) => s.isNotEmpty)
        .toList(growable: false);

    return Shikigami(
      id: json['id'] as String,
      nameVi: json['name_vi'] as String,
      nameJp: json['name_jp'] as String? ?? '',
      nameEn: json['name_en'] as String? ?? '',
      friendlyNames: friendly,
      rarity: json['rarity'] as String? ?? 'N',
      description: json['description'] as String? ?? '',
      obtain: List<String>.from(json['obtain'] as List? ?? const []),
      stats: stats == null
          ? ShikigamiStats.empty
          : ShikigamiStats.fromJson(Map<String, dynamic>.from(stats as Map)),
      skills: skills,
      recommendedSouls: List<String>.from(
        json['recommended_souls'] as List? ?? const [],
      ),
      slotMains: _parseSlotMains(json['slot_mains']),
      lore: json['lore'] as String? ?? '',
      image: json['image'] as String? ?? '',
    );
  }
}

/// Parse the JSONB `slot_mains` shape from Supabase. Tolerates absent column,
/// null, non-map, or partially-filled maps. Unknown slot keys are dropped;
/// non-string entries inside the value array are stringified.
Map<String, List<String>> _parseSlotMains(dynamic raw) {
  final result = <String, List<String>>{
    for (final s in kSlotNumbers) s: const <String>[],
  };
  if (raw is Map) {
    for (final slot in kSlotNumbers) {
      final v = raw[slot];
      if (v is List) {
        result[slot] = v
            .map((e) => e.toString())
            .where((s) => s.isNotEmpty)
            .toList(growable: false);
      }
    }
  }
  return result;
}
