import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/asset_image_placeholder.dart';
import '../models/skill.dart';

class SkillSection extends StatelessWidget {
  const SkillSection({super.key, required this.skills});

  final List<Skill> skills;

  @override
  Widget build(BuildContext context) {
    if (skills.isEmpty) {
      return const Padding(
        padding: EdgeInsets.all(24),
        child: Text('Chưa có thông tin kỹ năng.'),
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: skills.length,
      separatorBuilder: (_, _) => const SizedBox(height: 12),
      itemBuilder: (_, i) => _SkillTile(skill: skills[i], index: i),
    );
  }
}

class _SkillTile extends StatefulWidget {
  const _SkillTile({required this.skill, required this.index});

  final Skill skill;
  final int index;

  @override
  State<_SkillTile> createState() => _SkillTileState();
}

class _SkillTileState extends State<_SkillTile> {
  int? _selectedUpgrade;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final levels = widget.skill.resolvedLevels;
    final byLevel = {for (final lv in levels) lv.level: lv};
    final base =
        byLevel[1] ??
        (levels.isNotEmpty
            ? levels.first
            : const SkillLevel(level: 1, description: ''));
    final upgradeLevels = byLevel.keys.where((lv) => lv >= 2).toList()..sort();
    final maxLevel = upgradeLevels.isEmpty ? 1 : upgradeLevels.last;

    final currentUpgrade =
        _selectedUpgrade == null || !upgradeLevels.contains(_selectedUpgrade)
        ? (upgradeLevels.isNotEmpty ? upgradeLevels.first : null)
        : _selectedUpgrade;
    final currentUpgradeDesc = currentUpgrade == null
        ? null
        : byLevel[currentUpgrade]?.description;

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                _SkillLeading(
                  index: widget.index,
                  image: widget.skill.image,
                  skillName: widget.skill.name,
                  scheme: theme.colorScheme,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    widget.skill.name,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                if (widget.skill.cost != null)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 3,
                    ),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      '${widget.skill.cost} Hoả',
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: theme.colorScheme.onPrimaryContainer,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            _LevelDescription(
              description: base.description.isEmpty
                  ? 'Chưa có mô tả cấp độ này.'
                  : base.description,
            ),
            if (upgradeLevels.isNotEmpty) ...[
              const SizedBox(height: 14),
              Text(
                'Nâng cấp',
                style: theme.textTheme.labelMedium?.copyWith(
                  color: theme.colorScheme.outline,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 8),
              _LevelSelector(
                levels: const [2, 3, 4, 5],
                enabled: upgradeLevels.toSet(),
                selected: currentUpgrade,
                maxLevel: maxLevel,
                onChanged: (lv) => setState(() => _selectedUpgrade = lv),
              ),
              const SizedBox(height: 10),
              _LevelDescription(
                levelLabel: 'Lv$currentUpgrade',
                description: (currentUpgradeDesc ?? '').isEmpty
                    ? 'Chưa có mô tả cấp độ này.'
                    : currentUpgradeDesc!,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _SkillLeading extends StatelessWidget {
  const _SkillLeading({
    required this.index,
    required this.image,
    required this.skillName,
    required this.scheme,
  });

  final int index;
  final String image;
  final String skillName;
  final ColorScheme scheme;

  @override
  Widget build(BuildContext context) {
    if (image.isNotEmpty) {
      return SizedBox(
        width: 36,
        height: 36,
        child: AssetImagePlaceholder(
          assetPath: image,
          fallbackLabel: skillName,
          borderRadius: BorderRadius.circular(8),
        ),
      );
    }
    return CircleAvatar(
      radius: 14,
      backgroundColor: scheme.primary,
      child: Text(
        '${index + 1}',
        style: TextStyle(
          color: scheme.onPrimary,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _LevelSelector extends StatelessWidget {
  const _LevelSelector({
    required this.levels,
    required this.enabled,
    required this.selected,
    required this.maxLevel,
    required this.onChanged,
  });

  final List<int> levels;
  final Set<int> enabled;
  final int? selected;
  final int maxLevel;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          for (final lv in levels)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: _LevelChip(
                label: 'Lv$lv',
                isSelected: lv == selected,
                isEnabled: enabled.contains(lv),
                isMax: lv == maxLevel && enabled.contains(lv),
                onTap: enabled.contains(lv) ? () => onChanged(lv) : null,
                theme: theme,
              ),
            ),
        ],
      ),
    );
  }
}

class _LevelChip extends StatelessWidget {
  const _LevelChip({
    required this.label,
    required this.isSelected,
    required this.isEnabled,
    required this.isMax,
    required this.onTap,
    required this.theme,
  });

  final String label;
  final bool isSelected;
  final bool isEnabled;
  final bool isMax;
  final VoidCallback? onTap;
  final ThemeData theme;

  @override
  Widget build(BuildContext context) {
    final Color bg;
    final Color fg;
    if (!isEnabled) {
      bg = theme.colorScheme.surfaceContainerHighest;
      fg = theme.colorScheme.outline;
    } else if (isSelected) {
      bg = isMax ? AppColors.brandGold : theme.colorScheme.primary;
      fg = isMax ? Colors.black : theme.colorScheme.onPrimary;
    } else {
      bg = theme.colorScheme.primaryContainer.withValues(alpha: 0.5);
      fg = theme.colorScheme.onPrimaryContainer;
    }
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(10),
          border: isMax && isSelected
              ? Border.all(color: AppColors.brandGold, width: 1.5)
              : null,
        ),
        child: Text(
          label,
          style: TextStyle(
            color: fg,
            fontSize: 12,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}

class _LevelDescription extends StatelessWidget {
  const _LevelDescription({this.levelLabel, required this.description});

  final String? levelLabel;
  final String description;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (levelLabel != null)
            Text(
              levelLabel!,
              style: theme.textTheme.labelSmall?.copyWith(
                color: theme.colorScheme.primary,
                letterSpacing: 1.1,
                fontWeight: FontWeight.w700,
              ),
            ),
          const SizedBox(height: 6),
          Text(
            description,
            style: theme.textTheme.bodyMedium?.copyWith(height: 1.5),
          ),
        ],
      ),
    );
  }
}
