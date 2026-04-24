import 'package:flutter/foundation.dart';

@immutable
class SkillLevel {
  const SkillLevel({required this.level, required this.description});

  final int level;
  final String description;

  factory SkillLevel.fromJson(Map<String, dynamic> json) {
    return SkillLevel(
      level: (json['level'] as num).toInt(),
      description: json['description'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'level': level,
        'description': description,
      };
}

@immutable
class Skill {
  const Skill({
    required this.name,
    required this.description,
    this.levels = const [],
    this.cost,
    this.image = '',
  });

  final String name;

  /// Mô tả base (Lv1) — giữ tương thích với dữ liệu legacy không có `levels`.
  final String description;

  /// Mô tả theo từng cấp độ, level 1 là base, tối đa level 5.
  final List<SkillLevel> levels;

  final int? cost;

  /// Icon của kỹ năng (asset path). User điền tay; scraper để rỗng.
  final String image;

  List<SkillLevel> get resolvedLevels {
    if (levels.isNotEmpty) return levels;
    if (description.isNotEmpty) {
      return [SkillLevel(level: 1, description: description)];
    }
    return const [];
  }

  factory Skill.fromJson(Map<String, dynamic> json) {
    final rawLevels = json['levels'] as List? ?? const [];
    return Skill(
      name: json['name'] as String,
      description: json['description'] as String? ?? '',
      levels: rawLevels
          .map((e) => SkillLevel.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList(growable: false),
      cost: json['cost'] as int?,
      image: json['image'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'name': name,
        'description': description,
        'levels': [for (final lv in levels) lv.toJson()],
        'image': image,
        if (cost != null) 'cost': cost,
      };
}
