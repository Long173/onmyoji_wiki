import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

class RarityBadge extends StatelessWidget {
  const RarityBadge({super.key, required this.rarity});

  final String rarity;

  Color _color() {
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
    final color = _color();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color, width: 1),
      ),
      child: Text(
        rarity.toUpperCase(),
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
