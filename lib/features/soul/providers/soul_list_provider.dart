import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/remote_data_source.dart';
import '../models/soul.dart';

final soulByIdProvider =
    FutureProvider.family<Soul?, String>((ref, id) async {
  final remote = ref.read(remoteDataSourceProvider);
  final raw = await remote.fetchSoulById(id);
  return raw == null ? null : Soul.fromJson(raw);
});

/// Bulk fetch by ids — used by the shikigami detail "Ngự hồn đề xuất" list
/// to resolve N ids in a single server call.
final soulsByIdsProvider =
    FutureProvider.family<List<Soul>, List<String>>((ref, ids) async {
  if (ids.isEmpty) return const [];
  final remote = ref.read(remoteDataSourceProvider);
  final raw = await remote.fetchSoulsByIds(ids);
  return raw.map(Soul.fromJson).toList(growable: false);
});

class SoulFilter {
  const SoulFilter({
    this.query = '',
    this.debouncedQuery = '',
    this.kind,
  });

  final String query;
  final String debouncedQuery;
  final SoulKind? kind;

  SoulFilter copyWith({
    String? query,
    String? debouncedQuery,
    Object? kind = _sentinel,
  }) {
    return SoulFilter(
      query: query ?? this.query,
      debouncedQuery: debouncedQuery ?? this.debouncedQuery,
      kind: identical(kind, _sentinel) ? this.kind : kind as SoulKind?,
    );
  }

  static const _sentinel = Object();
}

class SoulFilterNotifier extends StateNotifier<SoulFilter> {
  SoulFilterNotifier() : super(const SoulFilter());

  Timer? _debounce;

  void setQuery(String q) {
    state = state.copyWith(query: q);
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      if (mounted) {
        state = state.copyWith(debouncedQuery: q);
      }
    });
  }

  void setKind(SoulKind? kind) => state = state.copyWith(kind: kind);

  void reset() {
    _debounce?.cancel();
    state = const SoulFilter();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }
}

final soulFilterProvider =
    StateNotifierProvider<SoulFilterNotifier, SoulFilter>(
  (ref) => SoulFilterNotifier(),
);
