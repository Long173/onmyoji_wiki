import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

class AssetImagePlaceholder extends StatelessWidget {
  const AssetImagePlaceholder({
    super.key,
    required this.assetPath,
    required this.fallbackLabel,
    this.fit = BoxFit.cover,
    this.borderRadius,
  });

  final String assetPath;
  final String fallbackLabel;
  final BoxFit fit;
  final BorderRadius? borderRadius;

  @override
  Widget build(BuildContext context) {
    final radius = borderRadius ?? BorderRadius.zero;
    return ClipRRect(
      borderRadius: radius,
      child: Image.asset(
        assetPath,
        fit: fit,
        errorBuilder: (_, _, _) => _Fallback(label: fallbackLabel),
      ),
    );
  }
}

class _Fallback extends StatelessWidget {
  const _Fallback({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final initials = _initials(label);
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.brandRed.withValues(alpha: 0.35),
            AppColors.inkBlack,
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      alignment: Alignment.center,
      child: Text(
        initials,
        style: const TextStyle(
          color: AppColors.brandGold,
          fontSize: 22,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.5,
        ),
      ),
    );
  }

  static String _initials(String label) {
    final parts = label.trim().split(RegExp(r'\s+'));
    if (parts.isEmpty) return '?';
    if (parts.length == 1) {
      return parts.first.characters.take(2).toString().toUpperCase();
    }
    return (parts.first.characters.first + parts.last.characters.first)
        .toUpperCase();
  }
}
