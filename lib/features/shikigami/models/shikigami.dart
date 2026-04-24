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

String _labelForRole(String role) {
  switch (role) {
    case 'attacker':
      return 'Công';
    case 'defender':
      return 'Thủ';
    case 'support':
      return 'Hỗ trợ';
    case 'control':
      return 'Khống chế';
    default:
      return role;
  }
}

@immutable
class Shikigami {
  const Shikigami({
    required this.id,
    required this.nameVi,
    required this.nameJp,
    required this.nameEn,
    required this.friendlyNames,
    required this.rarity,
    required this.roles,
    required this.description,
    required this.obtain,
    required this.stats,
    required this.skills,
    required this.recommendedSouls,
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

  /// 1 Thức Thần có thể đa vai trò (vừa công vừa thủ). Để rỗng nếu chưa phân loại.
  final List<String> roles;

  final String description;
  final List<String> obtain;
  final ShikigamiStats stats;
  final List<Skill> skills;
  final List<String> recommendedSouls;
  final String lore;
  final String image;

  List<String> get roleLabels =>
      [for (final r in roles) _labelForRole(r)];

  String get roleLabel => roleLabels.isEmpty ? '' : roleLabels.join(' · ');

  bool hasRole(String role) => roles.contains(role);

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

    final rawRole = json['role'];
    final List<String> roles;
    if (rawRole is List) {
      roles = rawRole
          .map((e) => e.toString())
          .where((s) => s.isNotEmpty)
          .toList(growable: false);
    } else if (rawRole is String && rawRole.isNotEmpty) {
      roles = [rawRole];
    } else {
      roles = const [];
    }

    return Shikigami(
      id: json['id'] as String,
      nameVi: json['name_vi'] as String,
      nameJp: json['name_jp'] as String? ?? '',
      nameEn: json['name_en'] as String? ?? '',
      friendlyNames: friendly,
      rarity: json['rarity'] as String? ?? 'N',
      roles: roles,
      description: json['description'] as String? ?? '',
      obtain: List<String>.from(json['obtain'] as List? ?? const []),
      stats: stats == null
          ? ShikigamiStats.empty
          : ShikigamiStats.fromJson(Map<String, dynamic>.from(stats as Map)),
      skills: skills,
      recommendedSouls:
          List<String>.from(json['recommended_souls'] as List? ?? const []),
      lore: json['lore'] as String? ?? '',
      image: json['image'] as String? ?? '',
    );
  }
}
