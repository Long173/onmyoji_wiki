import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

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
  late final TextEditingController _searchCtrl;

  @override
  void initState() {
    super.initState();
    _searchCtrl = TextEditingController(
      text: ref.read(effectFilterProvider).query,
    );
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final filter = ref.watch(effectFilterProvider);
    final filterNotifier = ref.read(effectFilterProvider.notifier);
    final resultAsync = ref.watch(filteredEffectsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Hiệu ứng')),
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
                    icon: Icons.auto_fix_high_outlined,
                    title: 'Chưa có hiệu ứng',
                    message:
                        'Bổ sung vào assets/data/effects.json rồi hot-restart.',
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: list.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (_, i) => EffectCard(effect: list[i]),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
