import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:infinite_scroll_pagination/infinite_scroll_pagination.dart';

import '../../../core/data/remote_data_source.dart';
import '../../../core/widgets/empty_state.dart';
import '../models/shikigami.dart';
import '../providers/shikigami_list_provider.dart';
import '../widgets/rarity_filter_bar.dart';
import '../widgets/shikigami_card.dart';

class ShikigamiListScreen extends ConsumerStatefulWidget {
  const ShikigamiListScreen({super.key});

  @override
  ConsumerState<ShikigamiListScreen> createState() =>
      _ShikigamiListScreenState();
}

class _ShikigamiListScreenState extends ConsumerState<ShikigamiListScreen> {
  static const _pageSize = 30;

  late final TextEditingController _searchCtrl;
  late final PagingController<int, Shikigami> _paging;

  @override
  void initState() {
    super.initState();
    _searchCtrl = TextEditingController(
      text: ref.read(shikigamiFilterProvider).query,
    );
    _paging = PagingController<int, Shikigami>(
      // Offset-based: first key is 0; each next key is `currentItems.length`.
      // Stop when the last fetched page came back smaller than the page size.
      getNextPageKey: (state) {
        if (state.pages == null) return 0;
        final lastPage = state.pages!.lastOrNull;
        if (lastPage == null || lastPage.length < _pageSize) return null;
        return (state.keys?.lastOrNull ?? 0) + _pageSize;
      },
      fetchPage: (offset) async {
        final filter = ref.read(shikigamiFilterProvider);
        final raw = await ref.read(remoteDataSourceProvider).fetchShikigami(
              rarity: filter.rarity,
              search: filter.debouncedQuery,
              offset: offset,
              limit: _pageSize,
            );
        return raw.map(Shikigami.fromJson).toList(growable: false);
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
    // Refresh paging when rarity or debounced search changes.
    ref.listen<({String? rarity, String search})>(
      shikigamiFilterProvider
          .select((f) => (rarity: f.rarity, search: f.debouncedQuery)),
      (_, _) => _paging.refresh(),
    );

    final filter = ref.watch(shikigamiFilterProvider);
    final filterNotifier = ref.read(shikigamiFilterProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Thức Thần'),
        actions: [
          // Tiny spinner whenever a page is in flight (first or subsequent).
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
                hintText: 'Tìm Thức Thần (VD: ibaraki, seimei)',
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
          RarityFilterBar(
            selected: filter.rarity,
            onChanged: filterNotifier.setRarity,
          ),
          const Divider(height: 1),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async => _paging.refresh(),
              child: PagingListener(
                controller: _paging,
                builder: (context, state, fetchNextPage) =>
                    PagedGridView<int, Shikigami>(
                  state: state,
                  fetchNextPage: fetchNextPage,
                  padding: const EdgeInsets.all(16),
                  gridDelegate:
                      const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 0.62,
                  ),
                  builderDelegate: PagedChildBuilderDelegate<Shikigami>(
                    animateTransitions: true,
                    itemBuilder: (_, item, _) =>
                        ShikigamiCard(shikigami: item),
                    noItemsFoundIndicatorBuilder: (_) => const EmptyState(
                      icon: Icons.search_off,
                      title: 'Không tìm thấy Thức Thần phù hợp',
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
