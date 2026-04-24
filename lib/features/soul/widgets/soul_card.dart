import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/asset_image_placeholder.dart';
import '../models/soul.dart';

class SoulCard extends StatelessWidget {
  const SoulCard({super.key, required this.soul});

  final Soul soul;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      child: InkWell(
        onTap: () => context.push(AppRoutes.soulDetailOf(soul.id)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AspectRatio(
              aspectRatio: 1,
              child: AssetImagePlaceholder(
                assetPath: soul.image,
                fallbackLabel: soul.displayName,
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    soul.displayName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.titleSmall
                        ?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  if (soul.nameVi.isNotEmpty && soul.nameEn.isNotEmpty)
                    Text(
                      soul.nameEn,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.outline,
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                  const SizedBox(height: 4),
                  Text(
                    soul.primaryEffectShort,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodySmall
                        ?.copyWith(color: theme.colorScheme.outline),
                  ),
                  const SizedBox(height: 6),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: _SoulKindBadge(kind: soul.kind),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SoulKindBadge extends StatelessWidget {
  const _SoulKindBadge({required this.kind});

  final SoulKind kind;

  @override
  Widget build(BuildContext context) {
    final color = kind == SoulKind.boss
        ? AppColors.brandRed
        : AppColors.brandGold;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color, width: 1),
      ),
      child: Text(
        kind.labelVi,
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.4,
        ),
      ),
    );
  }
}
