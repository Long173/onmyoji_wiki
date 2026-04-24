import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/asset_paths.dart';
import '../../../core/data/json_loader.dart';
import '../models/shikigami.dart';

class ShikigamiRepository {
  const ShikigamiRepository(this._loader);

  final JsonLoader _loader;

  /// Load dữ liệu Thức Thần từ các file JSON chia theo rarity rồi gộp lại.
  /// File thiếu sẽ được bỏ qua êm (để user còn chưa tạo file `n.json` chẳng hạn).
  Future<List<Shikigami>> loadAll() async {
    final results = <Shikigami>[];
    for (final path in AssetPaths.shikigamiJsonFiles) {
      try {
        final raw = await _loader.loadList(path);
        results.addAll(raw.map(Shikigami.fromJson));
      } catch (_) {
        // File rarity chưa có — bỏ qua để app không vỡ.
      }
    }
    return results;
  }
}

final shikigamiRepositoryProvider = Provider<ShikigamiRepository>((ref) {
  return ShikigamiRepository(ref.watch(jsonLoaderProvider));
});
