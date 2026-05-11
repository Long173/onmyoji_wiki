import '../config/env.dart';

/// Builders for Supabase Storage URLs (bucket `assets`).
///
/// Kept under the historical `AssetPaths` name + filename to avoid churning
/// every call site. Each helper returns a full https URL backed by
/// `Env.storagePublicBase`, which equals
/// `{SUPABASE_URL}/storage/v1/object/public/assets`.
///
/// Layout inside the bucket mirrors what used to be under `assets/images/`:
///   `shikigami/{ssr,sr,sp,r,n}/<id>.webp`
///   `souls/<id>.webp`
///   `effects/<id>.webp`
///   `skills/<n>.webp`
///   `rarity/<r>.webp`
class AssetPaths {
  const AssetPaths._();

  /// Rarity buckets — order matters (display order in filter bar).
  static const List<String> shikigamiRarities = ['ssr', 'sr', 'sp', 'r', 'n'];

  // ── Cache keys for the local JSON cache (not URLs).
  // The data layer uses these as opaque keys identifying which collection
  // (and which rarity slice) is being read from cache.
  static const String soulsCacheKey = 'souls';
  static const String effectsCacheKey = 'effects';
  static String shikigamiCacheKeyFor(String rarity) =>
      'shikigami/${rarity.toLowerCase()}';
  static List<String> get shikigamiCacheKeys =>
      [for (final r in shikigamiRarities) shikigamiCacheKeyFor(r)];

  // ── Image URLs (resolved against the Supabase Storage public CDN).
  static String shikigamiImage(String id, String rarity) =>
      _url('shikigami/${rarity.toLowerCase()}/$id.webp');

  static String soulImage(String id) => _url('souls/$id.webp');

  static String effectImage(String id) => _url('effects/$id.webp');

  static String rarityIcon(String rarity) =>
      _url('rarity/${rarity.toLowerCase()}.webp');

  /// Resolve an already-stored image reference. JSON records persist either
  /// a bucket-relative path (`shikigami/ssr/foo.webp`) or a legacy
  /// `assets/images/...` path — both forms are normalised here.
  static String resolveStored(String storedPath) {
    if (storedPath.isEmpty) return '';
    if (storedPath.startsWith('http://') ||
        storedPath.startsWith('https://')) {
      return storedPath;
    }
    final trimmed = storedPath.replaceFirst(
      RegExp(r'^(assets/images/|assets/)'),
      '',
    );
    return _url(trimmed);
  }

  static String _url(String relative) =>
      '${Env.storagePublicBase}/$relative';
}
