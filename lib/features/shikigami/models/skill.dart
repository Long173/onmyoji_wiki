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

/// Một dạng phụ của skill — cùng vị trí với skill chính nhưng đổi hình,
/// đổi hiệu ứng (ví dụ: skill biến hình giữa 2 hình thái). Không có level
/// riêng và không có cost — những trường đó thuộc về form chính.
@immutable
class AltSkillForm {
  const AltSkillForm({
    required this.name,
    required this.description,
    required this.image,
    required this.effects,
  });

  final String name;
  final String description;
  final String image;
  final List<String> effects;

  factory AltSkillForm.fromJson(Map<String, dynamic> json) {
    return AltSkillForm(
      name: json['name'] as String? ?? '',
      description: json['description'] as String? ?? '',
      image: json['image'] as String? ?? '',
      effects: (json['effects'] as List? ?? const [])
          .map((e) => e.toString())
          .toList(growable: false),
    );
  }

  Map<String, dynamic> toJson() => {
        'name': name,
        'description': description,
        'image': image,
        'effects': effects,
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
    this.effects = const [],
    this.altForms = const [],
  });

  final String name;

  /// Mô tả base (Lv1) — giữ tương thích với dữ liệu legacy không có `levels`.
  final String description;

  /// Mô tả theo từng cấp độ, level 1 là base, tối đa level 5.
  final List<SkillLevel> levels;

  final int? cost;

  /// Icon của kỹ năng (asset path). User điền tay; scraper để rỗng.
  final String image;

  /// Effect ids được tham chiếu trong description của skill này.
  final List<String> effects;

  /// Các dạng phụ cùng vị trí (skill biến hình). Rỗng khi skill chỉ có 1 dạng.
  final List<AltSkillForm> altForms;

  List<SkillLevel> get resolvedLevels {
    if (levels.isNotEmpty) return levels;
    if (description.isNotEmpty) {
      return [SkillLevel(level: 1, description: description)];
    }
    return const [];
  }

  factory Skill.fromJson(Map<String, dynamic> json) {
    final rawLevels = json['levels'] as List? ?? const [];
    final rawAlts = json['alt_forms'] as List? ?? const [];
    return Skill(
      name: json['name'] as String,
      description: json['description'] as String? ?? '',
      levels: rawLevels
          .map((e) => SkillLevel.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList(growable: false),
      cost: json['cost'] as int?,
      image: json['image'] as String? ?? '',
      effects: (json['effects'] as List? ?? const [])
          .map((e) => e.toString())
          .toList(growable: false),
      altForms: rawAlts
          .map((e) =>
              AltSkillForm.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList(growable: false),
    );
  }

  Map<String, dynamic> toJson() => {
        'name': name,
        'description': description,
        'levels': [for (final lv in levels) lv.toJson()],
        'image': image,
        'effects': effects,
        'alt_forms': [for (final a in altForms) a.toJson()],
        if (cost != null) 'cost': cost,
      };
}
