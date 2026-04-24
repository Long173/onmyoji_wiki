import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/app_router.dart';

class MainShell extends StatelessWidget {
  const MainShell({super.key, required this.child});

  final Widget child;

  static const _tabs = <_ShellTab>[
    _ShellTab(
      route: AppRoutes.shikigamiList,
      icon: Icons.auto_awesome_outlined,
      selectedIcon: Icons.auto_awesome,
      label: 'Thức Thần',
    ),
    _ShellTab(
      route: AppRoutes.soulList,
      icon: Icons.diamond_outlined,
      selectedIcon: Icons.diamond,
      label: 'Ngự hồn',
    ),
    _ShellTab(
      route: AppRoutes.effectList,
      icon: Icons.auto_fix_high_outlined,
      selectedIcon: Icons.auto_fix_high,
      label: 'Hiệu ứng',
    ),
    _ShellTab(
      route: AppRoutes.settings,
      icon: Icons.settings_outlined,
      selectedIcon: Icons.settings,
      label: 'Khác',
    ),
  ];

  int _indexFromLocation(String location) {
    for (var i = 0; i < _tabs.length; i++) {
      if (location.startsWith(_tabs[i].route)) return i;
    }
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).uri.toString();
    final index = _indexFromLocation(location);

    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (i) {
          if (i == index) return;
          context.go(_tabs[i].route);
        },
        destinations: [
          for (final tab in _tabs)
            NavigationDestination(
              icon: Icon(tab.icon),
              selectedIcon: Icon(tab.selectedIcon),
              label: tab.label,
            ),
        ],
      ),
    );
  }
}

class _ShellTab {
  const _ShellTab({
    required this.route,
    required this.icon,
    required this.selectedIcon,
    required this.label,
  });

  final String route;
  final IconData icon;
  final IconData selectedIcon;
  final String label;
}
