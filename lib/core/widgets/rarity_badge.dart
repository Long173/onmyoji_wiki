import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../constants/asset_paths.dart';
import '../theme/app_colors.dart';

/// Rarity label. Prefers the game-style icon from the Supabase Storage
/// bucket; falls back to a text chip with the rarity colour if the image is
/// missing or fails to load.
class RarityBadge extends StatelessWidget {
  const RarityBadge({super.key, required this.rarity, this.height = 22});

  final String rarity;
  final double height;

  Color _textColor() {
    switch (rarity.toUpperCase()) {
      case 'SP':
        return AppColors.raritySP;
      case 'SSR':
        return AppColors.raritySSR;
      case 'SR':
        return AppColors.raritySR;
      case 'R':
        return AppColors.rarityR;
      default:
        return AppColors.rarityN;
    }
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: height,
      child: CachedNetworkImage(
        imageUrl: AssetPaths.rarityIcon(rarity),
        fit: BoxFit.contain,
        // No placeholder — the badge area is tiny and the brief blank frame
        // is less distracting than a spinner.
        errorWidget: (_, _, _) => _TextBadge(
          rarity: rarity.toUpperCase(),
          color: _textColor(),
          height: height,
        ),
      ),
    );
  }
}

class _TextBadge extends StatelessWidget {
  const _TextBadge({
    required this.rarity,
    required this.color,
    required this.height,
  });

  final String rarity;
  final Color color;
  final double height;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color, width: 1),
      ),
      alignment: Alignment.center,
      child: Text(
        rarity,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}
