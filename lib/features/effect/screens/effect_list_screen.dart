import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:infinite_scroll_pagination/infinite_scroll_pagination.dart';

import '../../../core/data/remote_data_source.dart';
import '../../../core/widgets/empty_state.dart';
import '../models/effect.dart';
import '../providers/effect_list_provider.dart';
import '../widgets/effect_card.dart';

class EffectListScreen extends ConsumerStatefulWidget {
  const EffectListScreen({super.key});

  @override
  ConsumerState<EffectListScreen> createState() => _EffectListScreenState();
}

class _EffectListScreenState extends ConsumerState<EffectListScreen> {
  static const _pageSize = 30;

  late final TextEditingController _searchCtrl;
  late final PagingController<int, Effect> _paging;

  @override
  void initState() {
    super.initState();
    _searchCtrl = TextEditingController(
      text: ref.read(effectFilterProvider).query,
    );
    _paging = PagingController<int, Effect>(
      getNextPageKey: (state) {
        if (state.pages == null) return 0;
        final lastPage = state.pages!.lastOrNull;
        if (lastPage == null || lastPage.length < _pageSize) return null;
        return (state.keys?.lastOrNull ?? 0) + _pageSize;
      },
      fetchPage: (offset) async {
        final filter = ref.read(effectFilterProvider);
        final raw = await ref.read(remoteDataSourceProvider).fetchEffects(
              kind: filter.kind?.apiValue,
              search: filter.debouncedQuery,
              offset: offset,
              limit: _pageSize,
            );
        return raw.map(Effect.fromJson).toList(growable: false);
      },
    );
  }

  @override
  void dispose() {
    _paging.dispose();
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<({EffectKind? kind, String search})>(
      effectFilterProvider
          .select((f) => (kind: f.kind, search: f.debouncedQuery)),
      (_, _) => _paging.refresh(),
    );

    final filter = ref.watch(effectFilterProvider);
    final filterNotifier = ref.read(effectFilterProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Hiệu ứng'),
        actions: [
          ListenableBuilder(
            listenable: _paging,
            builder: (context, _) {
              if (!_paging.value.isLoading) return const SizedBox.shrink();
              return const Padding(
                padding: EdgeInsets.only(right: 16),
                child: Center(
                  child: SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                ),
              );
            },
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: TextField(
              controller: _searchCtrl,
              decoration: InputDecoration(
                hintText: 'Tìm hiệu ứng (VD: máu xám, thời huy)',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: filter.query.isEmpty
                    ? null
                    : IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchCtrl.clear();
                          filterNotifier.setQuery('');
                        },
                      ),
              ),
              textInputAction: TextInputAction.search,
              onChanged: filterNotifier.setQuery,
            ),
          ),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                ChoiceChip(
                  label: const Text('Tất cả'),
                  selected: filter.kind == null,
                  onSelected: (_) => filterNotifier.setKind(null),
                ),
                const SizedBox(width: 8),
                for (final kind in EffectKind.values) ...[
                  ChoiceChip(
                    label: Text(kind.labelVi),
                    selected: filter.kind == kind,
                    onSelected: (sel) =>
                        filterNotifier.setKind(sel ? kind : null),
                  ),
                  const SizedBox(width: 8),
                ],
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async => _paging.refresh(),
              child: PagingListener(
                controller: _paging,
                builder: (context, state, fetchNextPage) =>
                    PagedListView<int, Effect>.separated(
                  state: state,
                  fetchNextPage: fetchNextPage,
                  padding: const EdgeInsets.all(16),
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  builderDelegate: PagedChildBuilderDelegate<Effect>(
                    animateTransitions: true,
                    itemBuilder: (_, item, _) => EffectCard(effect: item),
                    noItemsFoundIndicatorBuilder: (_) => const EmptyState(
                      icon: Icons.search_off,
                      title: 'Không tìm thấy hiệu ứng phù hợp',
                      message: 'Thử đổi từ khoá hoặc bộ lọc.',
                    ),
                    firstPageErrorIndicatorBuilder: (_) => EmptyState(
                      icon: Icons.error_outline,
                      title: 'Không tải được dữ liệu',
                      message: '${_paging.value.error}',
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
