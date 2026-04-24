import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/asset_image_placeholder.dart';
import '../../../core/widgets/empty_state.dart';
import '../models/soul.dart';
import '../providers/soul_list_provider.dart';
import '../widgets/soul_effect_tile.dart';

class SoulDetailScreen extends ConsumerWidget {
  const SoulDetailScreen({super.key, required this.id});

  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(soulByIdProvider(id));
    return Scaffold(
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Scaffold(
          appBar: AppBar(),
          body: EmptyState(
            icon: Icons.error_outline,
            title: 'Lỗi tải dữ liệu',
            message: '$e',
          ),
        ),
        data: (soul) {
          if (soul == null) {
            return Scaffold(
              appBar: AppBar(),
              body: const EmptyState(
                icon: Icons.search_off,
                title: 'Không tìm thấy ngự hồn này',
              ),
            );
          }
          return _DetailBody(soul: soul);
        },
      ),
    );
  }
}

class _DetailBody extends StatelessWidget {
  const _DetailBody({required this.soul});

  final Soul soul;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return CustomScrollView(
      slivers: [
        SliverAppBar(
          pinned: true,
          expandedHeight: 260,
          backgroundColor: theme.colorScheme.surface,
          surfaceTintColor: theme.colorScheme.surface,
          foregroundColor: theme.colorScheme.onSurface,
          flexibleSpace: FlexibleSpaceBar(
            title: Text(
              soul.displayName,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: theme.colorScheme.onSurface,
              ),
            ),
            background: Stack(
              fit: StackFit.expand,
              children: [
                AssetImagePlaceholder(
                  assetPath: soul.image,
                  fallbackLabel: soul.displayName,
                ),
                DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        Colors.transparent,
                        AppColors.inkBlack.withValues(alpha: 0.85),
                      ],
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      stops: const [0.4, 1],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        SliverPadding(
          padding: const EdgeInsets.all(16),
          sliver: SliverList(
            delegate: SliverChildListDelegate.fixed([
              if (soul.nameVi.isNotEmpty && soul.nameEn.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(
                    soul.nameEn,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.outline,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ),
              _SoulKindChip(kind: soul.kind),
              const SizedBox(height: 16),
              Text('Hiệu ứng bộ', style: theme.textTheme.titleSmall),
              const SizedBox(height: 8),
              for (var i = 0; i < soul.effects.length; i++) ...[
                SoulEffectTile(
                  pieces: soul.effects[i].pieces,
                  description: soul.effects[i].description,
                ),
                if (i != soul.effects.length - 1) const SizedBox(height: 10),
              ],
              if (soul.effects.isEmpty)
                Text(
                  'Chưa có mô tả hiệu ứng.',
                  style: theme.textTheme.bodyMedium
                      ?.copyWith(color: theme.colorScheme.outline),
                ),
            ]),
          ),
        ),
      ],
    );
  }
}

class _SoulKindChip extends StatelessWidget {
  const _SoulKindChip({required this.kind});

  final SoulKind kind;

  @override
  Widget build(BuildContext context) {
    final color = kind == SoulKind.boss
        ? AppColors.brandRed
        : AppColors.brandGold;
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.18),
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: color),
        ),
        child: Text(
          kind.labelVi,
          style: TextStyle(
            color: color,
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.5,
          ),
        ),
      ),
    );
  }
}
