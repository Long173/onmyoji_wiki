import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/app_router.dart';
import '../../../core/widgets/asset_image_placeholder.dart';
import '../../../core/widgets/rarity_badge.dart';
import '../models/shikigami.dart';

class ShikigamiCard extends StatelessWidget {
  const ShikigamiCard({super.key, required this.shikigami});

  final Shikigami shikigami;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      child: InkWell(
        onTap: () =>
            context.push(AppRoutes.shikigamiDetailOf(shikigami.id)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AspectRatio(
              aspectRatio: 1,
              child: AssetImagePlaceholder(
                assetPath: shikigami.image,
                fallbackLabel: shikigami.nameVi,
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    shikigami.nameVi,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.titleSmall
                        ?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    shikigami.roleLabel,
                    style: theme.textTheme.bodySmall
                        ?.copyWith(color: theme.colorScheme.outline),
                  ),
                  const SizedBox(height: 6),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: RarityBadge(rarity: shikigami.rarity),
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
