import 'package:flutter/foundation.dart';

enum SoulKind {
  /// Ngự thường — bộ ngự hồn thường, kích hoạt theo 2 / 4 mảnh.
  normal,

  /// Ngự boss — drop từ raid/hồn boss, kích hoạt theo 1 / 2 mảnh.
  boss;

  String get apiValue {
    switch (this) {
      case SoulKind.boss:
        return 'boss';
      case SoulKind.normal:
        return 'normal';
    }
  }

  String get labelVi {
    switch (this) {
      case SoulKind.boss:
        return 'Ngự boss';
      case SoulKind.normal:
        return 'Ngự thường';
    }
  }

  /// Các mốc mảnh mà mỗi kind hỗ trợ (để hiển thị template, gợi ý).
  List<int> get expectedPieces {
    switch (this) {
      case SoulKind.boss:
        return const [1, 2];
      case SoulKind.normal:
        return const [2, 4];
    }
  }

  static SoulKind fromString(String? raw) {
    return (raw ?? '').toLowerCase() == 'boss' ? SoulKind.boss : SoulKind.normal;
  }
}

@immutable
class SoulEffect {
  const SoulEffect({required this.pieces, required this.description});

  final int pieces;
  final String description;

  factory SoulEffect.fromJson(Map<String, dynamic> json) {
    return SoulEffect(
      pieces: (json['pieces'] as num?)?.toInt() ?? 0,
      description: json['description'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'pieces': pieces,
        'description': description,
      };
}

@immutable
class Soul {
  const Soul({
    required this.id,
    required this.nameVi,
    required this.nameEn,
    required this.kind,
    required this.effects,
    required this.image,
  });

  final String id;

  /// Tên tiếng Việt — user điền tay sau khi scrape (ban đầu có thể rỗng).
  final String nameVi;

  /// Tên tiếng Anh từ fandom wiki — scraper ghi vào, user không cần sửa.
  final String nameEn;

  final SoulKind kind;
  final List<SoulEffect> effects;
  final String image;

  /// Trả tên dùng để hiển thị: ưu tiên VN, fallback EN.
  String get displayName => nameVi.isNotEmpty ? nameVi : nameEn;

  Iterable<String> get searchableNames =>
      [nameVi, nameEn, id].where((s) => s.isNotEmpty);

  SoulEffect? get primaryEffect => effects.isNotEmpty ? effects.first : null;

  String get primaryEffectShort {
    final e = primaryEffect?.description ?? '';
    const maxLen = 70;
    return e.length <= maxLen ? e : '${e.substring(0, maxLen).trimRight()}…';
  }

  factory Soul.fromJson(Map<String, dynamic> json) {
    final List<SoulEffect> effects;
    final rawEffects = json['effects'];
    if (rawEffects is List) {
      effects = rawEffects
          .map((e) => SoulEffect.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList(growable: false);
    } else {
      // Tương thích legacy (grade/effect_2pc/effect_4pc)
      final e2 = json['effect_2pc'] as String? ?? '';
      final e4 = json['effect_4pc'] as String? ?? '';
      effects = [
        if (e2.isNotEmpty) SoulEffect(pieces: 2, description: e2),
        if (e4.isNotEmpty) SoulEffect(pieces: 4, description: e4),
      ];
    }

    return Soul(
      id: json['id'] as String,
      nameVi: json['name_vi'] as String? ?? '',
      nameEn: json['name_en'] as String? ?? '',
      kind: SoulKind.fromString(json['kind'] as String?),
      effects: effects,
      image: json['image'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name_vi': nameVi,
        'name_en': nameEn,
        'kind': kind.apiValue,
        'effects': [for (final e in effects) e.toJson()],
        'image': image,
      };
}
