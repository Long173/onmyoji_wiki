import 'package:flutter/material.dart';

class RarityFilterBar extends StatelessWidget {
  const RarityFilterBar({
    super.key,
    required this.selected,
    required this.onChanged,
    this.rarities = const ['N', 'R', 'SR', 'SSR', 'SP'],
  });

  final String? selected;
  final ValueChanged<String?> onChanged;
  final List<String> rarities;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          _chip(context, label: 'Tất cả', value: null),
          const SizedBox(width: 8),
          for (final r in rarities) ...[
            _chip(context, label: r, value: r),
            const SizedBox(width: 8),
          ],
        ],
      ),
    );
  }

  Widget _chip(BuildContext context,
      {required String label, required String? value}) {
    final isSelected = selected == value;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (_) => onChanged(isSelected ? null : value),
    );
  }
}

class RoleFilterBar extends StatelessWidget {
  const RoleFilterBar({
    super.key,
    required this.selected,
    required this.onChanged,
  });

  static const _roles = <MapEntry<String, String>>[
    MapEntry('attacker', 'Công'),
    MapEntry('defender', 'Thủ'),
    MapEntry('support', 'Hỗ trợ'),
    MapEntry('control', 'Khống chế'),
  ];

  final String? selected;
  final ValueChanged<String?> onChanged;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
      child: Row(
        children: [
          for (final role in _roles) ...[
            FilterChip(
              label: Text(role.value),
              selected: selected == role.key,
              onSelected: (sel) => onChanged(sel ? role.key : null),
            ),
            const SizedBox(width: 8),
          ],
        ],
      ),
    );
  }
}
