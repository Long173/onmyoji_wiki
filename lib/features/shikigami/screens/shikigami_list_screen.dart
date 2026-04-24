import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/empty_state.dart';
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
  late final TextEditingController _searchCtrl;

  @override
  void initState() {
    super.initState();
    _searchCtrl = TextEditingController(
      text: ref.read(shikigamiFilterProvider).query,
    );
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final filter = ref.watch(shikigamiFilterProvider);
    final filterNotifier = ref.read(shikigamiFilterProvider.notifier);
    final resultAsync = ref.watch(filteredShikigamiProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Thức Thần')),
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
          RoleFilterBar(
            selected: filter.role,
            onChanged: filterNotifier.setRole,
          ),
          const Divider(height: 1),
          Expanded(
            child: resultAsync.when(
              loading: () =>
                  const Center(child: CircularProgressIndicator()),
              error: (e, _) => EmptyState(
                icon: Icons.error_outline,
                title: 'Không tải được dữ liệu',
                message: '$e',
              ),
              data: (list) {
                if (list.isEmpty) {
                  return const EmptyState(
                    icon: Icons.search_off,
                    title: 'Không tìm thấy Thức Thần phù hợp',
                    message: 'Thử đổi từ khoá hoặc bộ lọc.',
                  );
                }
                return GridView.builder(
                  padding: const EdgeInsets.all(16),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 0.62,
                  ),
                  itemCount: list.length,
                  itemBuilder: (_, i) =>
                      ShikigamiCard(shikigami: list[i]),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
