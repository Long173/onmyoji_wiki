import 'package:flutter/foundation.dart';

/// Loại hiệu ứng — dùng để lọc + chọn màu hiển thị.
enum EffectKind {
  buff,
  debuff,
  other;

  String get apiValue {
    switch (this) {
      case EffectKind.buff:
        return 'buff';
      case EffectKind.debuff:
        return 'debuff';
      case EffectKind.other:
        return 'other';
    }
  }

  String get label {
    switch (this) {
      case EffectKind.buff:
        return 'BUFF';
      case EffectKind.debuff:
        return 'DEBUFF';
      case EffectKind.other:
        return 'KHÁC';
    }
  }

  String get labelVi {
    switch (this) {
      case EffectKind.buff:
        return 'Buff';
      case EffectKind.debuff:
        return 'Debuff';
      case EffectKind.other:
        return 'Khác';
    }
  }

  static EffectKind fromString(String? raw) {
    switch ((raw ?? '').toLowerCase()) {
      case 'debuff':
        return EffectKind.debuff;
      case 'other':
        return EffectKind.other;
      case 'buff':
      default:
        return EffectKind.buff;
    }
  }
}

@immutable
class Effect {
  const Effect({
    required this.id,
    required this.name,
    required this.enName,
    required this.description,
    required this.image,
    this.kind = EffectKind.buff,
  });

  final String id;

  /// Tên tiếng Việt — user điền tay (có thể rỗng).
  final String name;

  /// Tên tiếng Anh từ fandom wiki — scraper ghi vào.
  final String enName;

  final String description;
  final String image;
  final EffectKind kind;

  bool get isDebuff => kind == EffectKind.debuff;
  bool get isOther => kind == EffectKind.other;

  String get displayName => name.isNotEmpty ? name : enName;

  Iterable<String> get searchableNames => [
        name,
        enName,
        id,
      ].where((s) => s.isNotEmpty);

  factory Effect.fromJson(Map<String, dynamic> json) {
    return Effect(
      id: json['id'] as String,
      name: json['name'] as String? ?? '',
      enName: json['en_name'] as String? ?? '',
      description: json['description'] as String? ?? '',
      image: json['image'] as String? ?? '',
      kind: EffectKind.fromString(json['kind'] as String?),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'en_name': enName,
        'description': description,
        'image': image,
        'kind': kind.apiValue,
      };
}
