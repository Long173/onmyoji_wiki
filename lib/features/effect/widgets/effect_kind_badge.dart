import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../models/effect.dart';

Color colorForEffectKind(EffectKind kind) {
  switch (kind) {
    case EffectKind.buff:
      return AppColors.brandGold;
    case EffectKind.debuff:
      return AppColors.brandRed;
    case EffectKind.other:
      return AppColors.rarityR; // lam nhạt, phân biệt khỏi đỏ/vàng
  }
}

class EffectKindBadge extends StatelessWidget {
  const EffectKindBadge({super.key, required this.kind, this.large = false});

  final EffectKind kind;
  final bool large;

  @override
  Widget build(BuildContext context) {
    final color = colorForEffectKind(kind);
    final fontSize = large ? 12.0 : 10.0;
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: large ? 10 : 6,
        vertical: large ? 4 : 2,
      ),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(large ? 6 : 4),
        border: Border.all(color: color),
      ),
      child: Text(
        kind.label,
        style: TextStyle(
          color: color,
          fontSize: fontSize,
          fontWeight: FontWeight.w700,
          letterSpacing: large ? 1 : 0.5,
        ),
      ),
    );
  }
}
