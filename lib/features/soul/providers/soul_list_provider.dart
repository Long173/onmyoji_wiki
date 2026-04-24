import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/utils/search_utils.dart';
import '../models/soul.dart';
import '../repositories/soul_repository.dart';

final soulListProvider = FutureProvider<List<Soul>>((ref) async {
  final repo = ref.watch(soulRepositoryProvider);
  final list = await repo.loadAll();
  return List.unmodifiable(list);
});

final soulByIdProvider =
    FutureProvider.family<Soul?, String>((ref, id) async {
  final list = await ref.watch(soulListProvider.future);
  for (final s in list) {
    if (s.id == id) return s;
  }
  return null;
});

class SoulFilter {
  const SoulFilter({this.query = '', this.kind});

  final String query;
  final SoulKind? kind;

  SoulFilter copyWith({String? query, Object? kind = _sentinel}) {
    return SoulFilter(
      query: query ?? this.query,
      kind: identical(kind, _sentinel) ? this.kind : kind as SoulKind?,
    );
  }

  static const _sentinel = Object();
}

class SoulFilterNotifier extends StateNotifier<SoulFilter> {
  SoulFilterNotifier() : super(const SoulFilter());

  void setQuery(String q) => state = state.copyWith(query: q);
  void setKind(SoulKind? kind) => state = state.copyWith(kind: kind);
  void reset() => state = const SoulFilter();
}

final soulFilterProvider =
    StateNotifierProvider<SoulFilterNotifier, SoulFilter>(
  (ref) => SoulFilterNotifier(),
);

final filteredSoulsProvider = Provider<AsyncValue<List<Soul>>>((ref) {
  final all = ref.watch(soulListProvider);
  final filter = ref.watch(soulFilterProvider);

  return all.whenData((list) {
    return list.where((s) {
      if (filter.kind != null && s.kind != filter.kind) return false;
      if (!matchesQuery(filter.query, s.searchableNames)) return false;
      return true;
    }).toList(growable: false);
  });
});
