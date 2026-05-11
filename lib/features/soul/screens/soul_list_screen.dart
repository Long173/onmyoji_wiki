import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:infinite_scroll_pagination/infinite_scroll_pagination.dart';

import '../../../core/data/remote_data_source.dart';
import '../../../core/widgets/empty_state.dart';
import '../models/soul.dart';
import '../providers/soul_list_provider.dart';
import '../widgets/soul_card.dart';

class SoulListScreen extends ConsumerStatefulWidget {
  const SoulListScreen({super.key});

  @override
  ConsumerState<SoulListScreen> createState() => _SoulListScreenState();
}

class _SoulListScreenState extends ConsumerState<SoulListScreen> {
  static const _pageSize = 30;

  late final TextEditingController _searchCtrl;
  late final PagingController<int, Soul> _paging;

  @override
  void initState() {
    super.initState();
    _searchCtrl = TextEditingController(
      text: ref.read(soulFilterProvider).query,
    );
    _paging = PagingController<int, Soul>(
      getNextPageKey: (state) {
        if (state.pages == null) return 0;
        final lastPage = state.pages!.lastOrNull;
        if (lastPage == null || lastPage.length < _pageSize) return null;
        return (state.keys?.lastOrNull ?? 0) + _pageSize;
      },
      fetchPage: (offset) async {
        final filter = ref.read(soulFilterProvider);
        final raw = await ref.read(remoteDataSourceProvider).fetchSouls(
              kind: filter.kind?.apiValue,
              search: filter.debouncedQuery,
              offset: offset,
              limit: _pageSize,
            );
        return raw.map(Soul.fromJson).toList(growable: false);
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
    ref.listen<({SoulKind? kind, String search})>(
      soulFilterProvider
          .select((f) => (kind: f.kind, search: f.debouncedQuery)),
      (_, _) => _paging.refresh(),
    );

    final filter = ref.watch(soulFilterProvider);
    final filterNotifier = ref.read(soulFilterProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Ngự hồn'),
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
                hintText: 'Tìm ngự hồn (VD: tỳ bà, shiranui)',
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
                for (final kind in SoulKind.values) ...[
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
                    PagedGridView<int, Soul>(
                  state: state,
                  fetchNextPage: fetchNextPage,
                  padding: const EdgeInsets.all(16),
                  gridDelegate:
                      const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    // Soul card có thêm nameEn + primaryEffect 2 dòng nên
                    // cần cao hơn shikigami card.
                    childAspectRatio: 0.56,
                  ),
                  builderDelegate: PagedChildBuilderDelegate<Soul>(
                    animateTransitions: true,
                    itemBuilder: (_, item, _) => SoulCard(soul: item),
                    noItemsFoundIndicatorBuilder: (_) => const EmptyState(
                      icon: Icons.search_off,
                      title: 'Không tìm thấy ngự hồn phù hợp',
                      message: 'Thử đổi từ khoá hoặc bộ lọc.',
                    ),
                    firstPageErrorIndicatorBuilder: (_) => EmptyState(
                      icon: Icons.error_outline,
                      title: 'Không tải được ngự hồn',
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
