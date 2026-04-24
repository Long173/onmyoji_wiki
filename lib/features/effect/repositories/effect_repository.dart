import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/asset_paths.dart';
import '../../../core/data/json_loader.dart';
import '../models/effect.dart';

class EffectRepository {
  const EffectRepository(this._loader);

  final JsonLoader _loader;

  Future<List<Effect>> loadAll() async {
    final raw = await _loader.loadList(AssetPaths.effectsJson);
    return raw.map(Effect.fromJson).toList(growable: false);
  }
}

final effectRepositoryProvider = Provider<EffectRepository>((ref) {
  return EffectRepository(ref.watch(jsonLoaderProvider));
});
