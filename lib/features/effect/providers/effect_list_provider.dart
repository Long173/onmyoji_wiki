import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/remote_data_source.dart';
import '../models/effect.dart';

final effectByIdProvider =
    FutureProvider.family<Effect?, String>((ref, id) async {
  final remote = ref.read(remoteDataSourceProvider);
  final raw = await remote.fetchEffectById(id);
  return raw == null ? null : Effect.fromJson(raw);
});

class EffectFilter {
  const EffectFilter({
    this.query = '',
    this.debouncedQuery = '',
    this.kind,
  });

  final String query;
  final String debouncedQuery;

  /// `null` = tất cả.
  final EffectKind? kind;

  EffectFilter copyWith({
    String? query,
    String? debouncedQuery,
    Object? kind = _sentinel,
  }) {
    return EffectFilter(
      query: query ?? this.query,
      debouncedQuery: debouncedQuery ?? this.debouncedQuery,
      kind: identical(kind, _sentinel) ? this.kind : kind as EffectKind?,
    );
  }

  static const _sentinel = Object();
}

class EffectFilterNotifier extends StateNotifier<EffectFilter> {
  EffectFilterNotifier() : super(const EffectFilter());

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

  void setKind(EffectKind? kind) => state = state.copyWith(kind: kind);

  void reset() {
    _debounce?.cancel();
    state = const EffectFilter();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }
}

final effectFilterProvider =
    StateNotifierProvider<EffectFilterNotifier, EffectFilter>(
  (ref) => EffectFilterNotifier(),
);
