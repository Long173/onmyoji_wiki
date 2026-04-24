import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/utils/search_utils.dart';
import '../models/effect.dart';
import '../repositories/effect_repository.dart';

final effectListProvider = FutureProvider<List<Effect>>((ref) async {
  final repo = ref.watch(effectRepositoryProvider);
  final list = await repo.loadAll();
  return List.unmodifiable(list);
});

final effectByIdProvider =
    FutureProvider.family<Effect?, String>((ref, id) async {
  final list = await ref.watch(effectListProvider.future);
  for (final e in list) {
    if (e.id == id) return e;
  }
  return null;
});

class EffectFilter {
  const EffectFilter({this.query = '', this.kind});

  final String query;

  /// `null` = tất cả.
  final EffectKind? kind;

  EffectFilter copyWith({String? query, Object? kind = _sentinel}) {
    return EffectFilter(
      query: query ?? this.query,
      kind: identical(kind, _sentinel) ? this.kind : kind as EffectKind?,
    );
  }

  static const _sentinel = Object();
}

class EffectFilterNotifier extends StateNotifier<EffectFilter> {
  EffectFilterNotifier() : super(const EffectFilter());

  void setQuery(String q) => state = state.copyWith(query: q);
  void setKind(EffectKind? kind) => state = state.copyWith(kind: kind);
  void reset() => state = const EffectFilter();
}

final effectFilterProvider =
    StateNotifierProvider<EffectFilterNotifier, EffectFilter>(
  (ref) => EffectFilterNotifier(),
);

final filteredEffectsProvider = Provider<AsyncValue<List<Effect>>>((ref) {
  final all = ref.watch(effectListProvider);
  final filter = ref.watch(effectFilterProvider);

  return all.whenData((list) {
    return list.where((e) {
      if (filter.kind != null && e.kind != filter.kind) return false;
      if (!matchesQuery(filter.query, e.searchableNames)) return false;
      return true;
    }).toList(growable: false);
  });
});
