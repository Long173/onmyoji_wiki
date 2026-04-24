import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/asset_image_placeholder.dart';
import '../../../core/widgets/empty_state.dart';
import '../models/effect.dart';
import '../providers/effect_list_provider.dart';
import '../widgets/effect_kind_badge.dart';

class EffectDetailScreen extends ConsumerWidget {
  const EffectDetailScreen({super.key, required this.id});

  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(effectByIdProvider(id));
    return Scaffold(
      appBar: AppBar(),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => EmptyState(
          icon: Icons.error_outline,
          title: 'Lỗi tải dữ liệu',
          message: '$e',
        ),
        data: (effect) {
          if (effect == null) {
            return const EmptyState(
              icon: Icons.search_off,
              title: 'Không tìm thấy hiệu ứng này',
            );
          }
          return _Body(effect: effect);
        },
      ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({required this.effect});

  final Effect effect;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        Center(
          child: SizedBox(
            width: 120,
            height: 120,
            child: AssetImagePlaceholder(
              assetPath: effect.image,
              fallbackLabel: effect.displayName,
              borderRadius: BorderRadius.circular(16),
            ),
          ),
        ),
        const SizedBox(height: 20),
        Text(
          effect.displayName,
          textAlign: TextAlign.center,
          style: theme.textTheme.headlineSmall
              ?.copyWith(fontWeight: FontWeight.w700),
        ),
        if (effect.name.isNotEmpty && effect.enName.isNotEmpty) ...[
          const SizedBox(height: 4),
          Text(
            effect.enName,
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.outline,
              fontStyle: FontStyle.italic,
            ),
          ),
        ],
        const SizedBox(height: 12),
        Center(child: EffectKindBadge(kind: effect.kind, large: true)),
        const SizedBox(height: 24),
        Text(
          effect.description.isEmpty
              ? 'Chưa có mô tả cho hiệu ứng này.'
              : effect.description,
          style: theme.textTheme.bodyLarge?.copyWith(height: 1.6),
        ),
      ],
    );
  }
}
