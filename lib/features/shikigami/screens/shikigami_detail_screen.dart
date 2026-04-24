import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/asset_image_placeholder.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/rarity_badge.dart';
import '../../soul/providers/soul_list_provider.dart';
import '../models/shikigami.dart';
import '../providers/shikigami_list_provider.dart';
import '../widgets/skill_section.dart';

class ShikigamiDetailScreen extends ConsumerWidget {
  const ShikigamiDetailScreen({super.key, required this.id});

  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncShiki = ref.watch(shikigamiByIdProvider(id));

    return Scaffold(
      body: asyncShiki.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Scaffold(
          appBar: AppBar(),
          body: EmptyState(
            icon: Icons.error_outline,
            title: 'Lỗi tải dữ liệu',
            message: '$e',
          ),
        ),
        data: (shiki) {
          if (shiki == null) {
            return Scaffold(
              appBar: AppBar(),
              body: const EmptyState(
                icon: Icons.search_off,
                title: 'Không tìm thấy Thức Thần này',
              ),
            );
          }
          return _DetailBody(shikigami: shiki);
        },
      ),
    );
  }
}

class _DetailBody extends StatelessWidget {
  const _DetailBody({required this.shikigami});

  final Shikigami shikigami;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return DefaultTabController(
      length: 4,
      child: NestedScrollView(
        headerSliverBuilder: (context, _) => [
          SliverAppBar(
            pinned: true,
            expandedHeight: 300,
            backgroundColor: scheme.surface,
            surfaceTintColor: scheme.surface,
            foregroundColor: scheme.onSurface,
            flexibleSpace: FlexibleSpaceBar(
              title: Text(
                shikigami.nameVi,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: scheme.onSurface,
                ),
              ),
              background: _Header(shikigami: shikigami),
              stretchModes: const [StretchMode.zoomBackground],
            ),
          ),
          SliverPersistentHeader(
            pinned: true,
            delegate: _TabBarDelegate(backgroundColor: scheme.surface),
          ),
        ],
        body: TabBarView(
          children: [
            _InfoTab(shikigami: shikigami),
            SkillSection(skills: shikigami.skills),
            _RecommendedSoulsTab(ids: shikigami.recommendedSouls),
            _LoreTab(lore: shikigami.lore),
          ],
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.shikigami});

  final Shikigami shikigami;

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        AssetImagePlaceholder(
          assetPath: shikigami.image,
          fallbackLabel: shikigami.nameVi,
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
        Positioned(
          left: 16,
          bottom: 60,
          right: 16,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  RarityBadge(rarity: shikigami.rarity),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 3,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      shikigami.roleLabel,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                [
                  shikigami.nameJp,
                  shikigami.nameEn,
                ].where((e) => e.isNotEmpty).join(' · '),
                style: const TextStyle(color: Colors.white70, fontSize: 13),
              ),
              if (shikigami.friendlyNames.isNotEmpty) ...[
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    for (final nick in shikigami.friendlyNames)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 3,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.brandGold.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(
                            color: AppColors.brandGold.withValues(alpha: 0.5),
                          ),
                        ),
                        child: Text(
                          nick,
                          style: const TextStyle(
                            color: AppColors.brandGold,
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _TabBarDelegate extends SliverPersistentHeaderDelegate {
  const _TabBarDelegate({required this.backgroundColor});

  final Color backgroundColor;

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    return Material(
      color: backgroundColor,
      elevation: overlapsContent ? 2 : 0,
      child: const TabBar(
        tabs: [
          Tab(text: 'Thông tin'),
          Tab(text: 'Kỹ năng'),
          Tab(text: 'Ngự hồn'),
          Tab(text: 'Truyện'),
        ],
      ),
    );
  }

  @override
  double get maxExtent => 48;
  @override
  double get minExtent => 48;
  @override
  bool shouldRebuild(_TabBarDelegate oldDelegate) =>
      oldDelegate.backgroundColor != backgroundColor;
}

class _InfoTab extends StatelessWidget {
  const _InfoTab({required this.shikigami});

  final Shikigami shikigami;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final stats = shikigami.stats;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(shikigami.description, style: theme.textTheme.bodyLarge),
        const SizedBox(height: 16),
        _StatsTable(
          rows: [
            _StatRow('Công', stats.attack),
            _StatRow('Máu', stats.hp),
            _StatRow('Thủ', stats.defense),
            _StatRow('Tốc độ', stats.speed),
            _StatRow('Chí mạng', stats.critRate, suffix: '%'),
            _StatRow('ST chí mạng', stats.critDmg, suffix: '%', showTier: false),
            _StatRow('Chính xác', stats.accuracy, suffix: '%', showTier: false),
            _StatRow('Kháng', stats.resist, suffix: '%', showTier: false),
          ],
        ),
      ],
    );
  }
}

class _StatRow {
  const _StatRow(
    this.label,
    this.stat, {
    this.suffix = '',
    this.showTier = true,
  });

  final String label;
  final StatValue stat;
  final String suffix;
  final bool showTier;
}

class _StatsTable extends StatelessWidget {
  const _StatsTable({required this.rows});

  final List<_StatRow> rows;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            for (var i = 0; i < rows.length; i++) ...[
              Row(
                children: [
                  Expanded(
                    child: Text(
                      rows[i].label,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.outline,
                      ),
                    ),
                  ),
                  Text(
                    '${rows[i].stat.value}${rows[i].suffix}',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(width: 10),
                  // Vẫn chừa chỗ đều các hàng, ẩn badge khi stat không xếp bậc.
                  SizedBox(
                    width: 36,
                    child: rows[i].showTier
                        ? _StatTierBadge(tier: rows[i].stat.tier)
                        : const SizedBox.shrink(),
                  ),
                ],
              ),
              if (i != rows.length - 1) const Divider(height: 16),
            ],
          ],
        ),
      ),
    );
  }
}

class _StatTierBadge extends StatelessWidget {
  const _StatTierBadge({required this.tier});

  final String tier;

  Color _color(ColorScheme scheme) {
    switch (tier.toUpperCase()) {
      case 'SS':
        return AppColors.brandGold;
      case 'S':
        return AppColors.raritySSR;
      case 'A':
        return AppColors.raritySP;
      case 'B':
        return AppColors.raritySR;
      case 'C':
        return AppColors.rarityR;
      case 'D':
        return AppColors.rarityN;
      default:
        return scheme.outlineVariant;
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final color = _color(scheme);
    final display = tier.isEmpty ? '—' : tier.toUpperCase();
    final isRated = tier.isNotEmpty;
    return Container(
      width: 36,
      alignment: Alignment.center,
      padding: const EdgeInsets.symmetric(vertical: 4),
      decoration: BoxDecoration(
        color: isRated
            ? color.withValues(alpha: 0.18)
            : scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(6),
        border: isRated
            ? Border.all(color: color, width: 1)
            : Border.all(color: scheme.outlineVariant, width: 1),
      ),
      child: Text(
        display,
        style: TextStyle(
          color: isRated ? color : scheme.outline,
          fontSize: 12,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}

class _RecommendedSoulsTab extends ConsumerWidget {
  const _RecommendedSoulsTab({required this.ids});

  final List<String> ids;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (ids.isEmpty) {
      return const EmptyState(
        icon: Icons.auto_awesome_outlined,
        title: 'Chưa có ngự hồn đề xuất',
      );
    }
    final allAsync = ref.watch(soulListProvider);
    return allAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => EmptyState(
        icon: Icons.error_outline,
        title: 'Không tải được ngự hồn',
        message: '$e',
      ),
      data: (all) {
        final byId = {for (final s in all) s.id: s};
        final matches = [
          for (final id in ids)
            if (byId[id] != null) byId[id]!,
        ];
        if (matches.isEmpty) {
          return const EmptyState(
            icon: Icons.search_off,
            title: 'Chưa cập nhật dữ liệu ngự hồn đề xuất',
          );
        }
        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: matches.length,
          separatorBuilder: (_, _) => const SizedBox(height: 10),
          itemBuilder: (_, i) {
            final soul = matches[i];
            return Card(
              margin: EdgeInsets.zero,
              child: ListTile(
                leading: SizedBox(
                  width: 48,
                  height: 48,
                  child: AssetImagePlaceholder(
                    assetPath: soul.image,
                    fallbackLabel: soul.displayName,
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                title: Text(soul.displayName),
                subtitle: Text(soul.primaryEffectShort),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push(AppRoutes.soulDetailOf(soul.id)),
              ),
            );
          },
        );
      },
    );
  }
}

class _LoreTab extends StatelessWidget {
  const _LoreTab({required this.lore});

  final String lore;

  @override
  Widget build(BuildContext context) {
    if (lore.isEmpty) {
      return const EmptyState(
        icon: Icons.menu_book_outlined,
        title: 'Chưa có truyện cho Thức Thần này',
      );
    }
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Text(
        lore,
        style: Theme.of(context).textTheme.bodyLarge?.copyWith(height: 1.6),
      ),
    );
  }
}
