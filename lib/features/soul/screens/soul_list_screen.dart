import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

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
  late final TextEditingController _searchCtrl;

  @override
  void initState() {
    super.initState();
    _searchCtrl = TextEditingController(
      text: ref.read(soulFilterProvider).query,
    );
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final filter = ref.watch(soulFilterProvider);
    final filterNotifier = ref.read(soulFilterProvider.notifier);
    final resultAsync = ref.watch(filteredSoulsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Ngự hồn')),
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
            child: resultAsync.when(
              loading: () =>
                  const Center(child: CircularProgressIndicator()),
              error: (e, _) => EmptyState(
                icon: Icons.error_outline,
                title: 'Không tải được ngự hồn',
                message: '$e',
              ),
              data: (list) {
                if (list.isEmpty) {
                  return const EmptyState(
                    icon: Icons.search_off,
                    title: 'Không tìm thấy ngự hồn phù hợp',
                    message: 'Thử đổi từ khoá hoặc bộ lọc.',
                  );
                }
                return GridView.builder(
                  padding: const EdgeInsets.all(16),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    // Soul card có thêm nameEn + primaryEffect 2 dòng
                    // nên cần cao hơn shikigami card.
                    childAspectRatio: 0.56,
                  ),
                  itemCount: list.length,
                  itemBuilder: (_, i) => SoulCard(soul: list[i]),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
