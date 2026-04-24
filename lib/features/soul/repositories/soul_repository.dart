import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/asset_paths.dart';
import '../../../core/data/json_loader.dart';
import '../models/soul.dart';

class SoulRepository {
  const SoulRepository(this._loader);

  final JsonLoader _loader;

  Future<List<Soul>> loadAll() async {
    final raw = await _loader.loadList(AssetPaths.soulsJson);
    return raw.map(Soul.fromJson).toList(growable: false);
  }
}

final soulRepositoryProvider = Provider<SoulRepository>((ref) {
  return SoulRepository(ref.watch(jsonLoaderProvider));
});
