import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/remote_data_source.dart';
import '../models/shikigami.dart';

/// Fetches one shikigami by id directly from Supabase. Used by the detail
/// screen — no local cache.
final shikigamiByIdProvider =
    FutureProvider.family<Shikigami?, String>((ref, id) async {
  final remote = ref.read(remoteDataSourceProvider);
  final raw = await remote.fetchShikigamiById(id);
  return raw == null ? null : Shikigami.fromJson(raw);
});

class ShikigamiFilter {
  const ShikigamiFilter({
    this.query = '',
    this.debouncedQuery = '',
    this.rarity,
  });

  /// Bound to the TextField — updates on every keystroke for immediate UI
  /// feedback (clear button visibility, etc.).
  final String query;

  /// Lagging copy of [query] that drives the server fetch. Updated 400ms
  /// after the last keystroke so we don't hit Supabase on every character.
  final String debouncedQuery;

  /// Rarity is instant (chip toggle) — no debounce.
  final String? rarity;

  ShikigamiFilter copyWith({
    String? query,
    String? debouncedQuery,
    Object? rarity = _sentinel,
  }) {
    return ShikigamiFilter(
      query: query ?? this.query,
      debouncedQuery: debouncedQuery ?? this.debouncedQuery,
      rarity: identical(rarity, _sentinel) ? this.rarity : rarity as String?,
    );
  }

  static const _sentinel = Object();
}

class ShikigamiFilterNotifier extends StateNotifier<ShikigamiFilter> {
  ShikigamiFilterNotifier() : super(const ShikigamiFilter());

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

  void setRarity(String? rarity) {
    state = state.copyWith(rarity: rarity);
  }

  void reset() {
    _debounce?.cancel();
    state = const ShikigamiFilter();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }
}

final shikigamiFilterProvider =
    StateNotifierProvider<ShikigamiFilterNotifier, ShikigamiFilter>(
  (ref) => ShikigamiFilterNotifier(),
);
