class AssetPaths {
  const AssetPaths._();

  /// Các rarity có file JSON riêng — giúp bạn chỉ mở/sửa đúng nhóm cần.
  static const List<String> shikigamiRarities = ['ssr', 'sr', 'sp', 'r', 'n'];

  static String shikigamiJsonFor(String rarity) =>
      'assets/data/shikigami/${rarity.toLowerCase()}.json';

  static List<String> get shikigamiJsonFiles =>
      [for (final r in shikigamiRarities) shikigamiJsonFor(r)];

  static const String soulsJson = 'assets/data/souls.json';
  static const String effectsJson = 'assets/data/effects.json';

  static String shikigamiImage(String id, String rarity) =>
      'assets/images/shikigami/${rarity.toLowerCase()}/$id.webp';
  static String soulImage(String id) => 'assets/images/souls/$id.webp';
  static String effectImage(String id) => 'assets/images/effects/$id.webp';
}
