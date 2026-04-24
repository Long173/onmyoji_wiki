import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/utils/search_utils.dart';
import '../models/shikigami.dart';
import '../repositories/shikigami_repository.dart';

final shikigamiListProvider = FutureProvider<List<Shikigami>>((ref) async {
  final repo = ref.watch(shikigamiRepositoryProvider);
  final list = await repo.loadAll();
  // Giữ nguyên thứ tự từ file JSON (scraper lưu theo ngày đăng, mới → cũ).
  return List.unmodifiable(list);
});

final shikigamiByIdProvider =
    FutureProvider.family<Shikigami?, String>((ref, id) async {
  final list = await ref.watch(shikigamiListProvider.future);
  for (final s in list) {
    if (s.id == id) return s;
  }
  return null;
});

class ShikigamiFilter {
  const ShikigamiFilter({
    this.query = '',
    this.rarity,
    this.role,
  });

  final String query;
  final String? rarity;
  final String? role;

  ShikigamiFilter copyWith({
    String? query,
    Object? rarity = _sentinel,
    Object? role = _sentinel,
  }) {
    return ShikigamiFilter(
      query: query ?? this.query,
      rarity: identical(rarity, _sentinel) ? this.rarity : rarity as String?,
      role: identical(role, _sentinel) ? this.role : role as String?,
    );
  }

  static const _sentinel = Object();
}

class ShikigamiFilterNotifier extends StateNotifier<ShikigamiFilter> {
  ShikigamiFilterNotifier() : super(const ShikigamiFilter());

  void setQuery(String q) => state = state.copyWith(query: q);
  void setRarity(String? rarity) => state = state.copyWith(rarity: rarity);
  void setRole(String? role) => state = state.copyWith(role: role);
  void reset() => state = const ShikigamiFilter();
}

final shikigamiFilterProvider =
    StateNotifierProvider<ShikigamiFilterNotifier, ShikigamiFilter>(
  (ref) => ShikigamiFilterNotifier(),
);

final filteredShikigamiProvider = Provider<AsyncValue<List<Shikigami>>>((ref) {
  final all = ref.watch(shikigamiListProvider);
  final filter = ref.watch(shikigamiFilterProvider);

  return all.whenData((list) {
    return list.where((s) {
      if (filter.rarity != null && s.rarity != filter.rarity) return false;
      if (filter.role != null && !s.hasRole(filter.role!)) return false;
      if (!matchesQuery(filter.query, s.searchableNames)) return false;
      return true;
    }).toList(growable: false);
  });
});
