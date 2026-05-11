import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../constants/asset_paths.dart';
import '../logging/api_logger.dart';
import '../theme/app_colors.dart';

/// Displays a cached network image with a branded fallback (gradient +
/// initials) when the image is missing or fails to load.
///
/// `imagePath` accepts any of:
///   - a full https URL
///   - a bucket-relative key (e.g. `shikigami/ssr/tu_kim_than.webp`)
///   - a legacy `assets/images/...` path (resolved against the bucket root)
///
/// Resolution happens via [AssetPaths.resolveStored]; an empty path skips
/// the network attempt entirely and renders the fallback directly.
class NetworkImagePlaceholder extends StatelessWidget {
  const NetworkImagePlaceholder({
    super.key,
    required this.imagePath,
    required this.fallbackLabel,
    this.fit = BoxFit.cover,
    this.borderRadius,
  });

  final String imagePath;
  final String fallbackLabel;
  final BoxFit fit;
  final BorderRadius? borderRadius;

  @override
  Widget build(BuildContext context) {
    final radius = borderRadius ?? BorderRadius.zero;
    final resolved = AssetPaths.resolveStored(imagePath);
    if (resolved.isEmpty) {
      return ClipRRect(
        borderRadius: radius,
        child: _Fallback(label: fallbackLabel),
      );
    }
    return ClipRRect(
      borderRadius: radius,
      child: CachedNetworkImage(
        imageUrl: resolved,
        fit: fit,
        // Skeleton while loading — slightly darker than fallback so the user
        // can tell "loading" from "missing".
        placeholder: (_, _) => const ColoredBox(color: AppColors.inkBlack),
        errorWidget: (_, url, error) {
          ApiLogger.event(
            'image.miss',
            extra: {'url': url, 'error': error.toString()},
          );
          return _Fallback(label: fallbackLabel);
        },
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
