import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/effect/screens/effect_detail_screen.dart';
import '../../features/effect/screens/effect_list_screen.dart';
import '../../features/settings/screens/settings_screen.dart';
import '../../features/shell/screens/main_shell.dart';
import '../../features/shikigami/screens/shikigami_detail_screen.dart';
import '../../features/shikigami/screens/shikigami_list_screen.dart';
import '../../features/soul/screens/soul_detail_screen.dart';
import '../../features/soul/screens/soul_list_screen.dart';

class AppRoutes {
  const AppRoutes._();

  static const String shikigamiList = '/shikigami';
  static const String shikigamiDetail = '/shikigami/:id';
  static const String soulList = '/souls';
  static const String soulDetail = '/souls/:id';
  static const String effectList = '/effects';
  static const String effectDetail = '/effects/:id';
  static const String settings = '/settings';

  static String shikigamiDetailOf(String id) => '/shikigami/$id';
  static String soulDetailOf(String id) => '/souls/$id';
  static String effectDetailOf(String id) => '/effects/$id';
}

final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorKey = GlobalKey<NavigatorState>();

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: AppRoutes.shikigamiList,
    routes: [
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (context, state, child) => MainShell(child: child),
        routes: [
          GoRoute(
            path: AppRoutes.shikigamiList,
            name: 'shikigamiList',
            pageBuilder: (_, _) => const NoTransitionPage(
              child: ShikigamiListScreen(),
            ),
            routes: [
              GoRoute(
                path: ':id',
                parentNavigatorKey: _rootNavigatorKey,
                name: 'shikigamiDetail',
                builder: (_, state) => ShikigamiDetailScreen(
                  id: state.pathParameters['id']!,
                ),
              ),
            ],
          ),
          GoRoute(
            path: AppRoutes.soulList,
            name: 'soulList',
            pageBuilder: (_, _) => const NoTransitionPage(
              child: SoulListScreen(),
            ),
            routes: [
              GoRoute(
                path: ':id',
                parentNavigatorKey: _rootNavigatorKey,
                name: 'soulDetail',
                builder: (_, state) => SoulDetailScreen(
                  id: state.pathParameters['id']!,
                ),
              ),
            ],
          ),
          GoRoute(
            path: AppRoutes.effectList,
            name: 'effectList',
            pageBuilder: (_, _) => const NoTransitionPage(
              child: EffectListScreen(),
            ),
            routes: [
              GoRoute(
                path: ':id',
                parentNavigatorKey: _rootNavigatorKey,
                name: 'effectDetail',
                builder: (_, state) => EffectDetailScreen(
                  id: state.pathParameters['id']!,
                ),
              ),
            ],
          ),
          GoRoute(
            path: AppRoutes.settings,
            name: 'settings',
            pageBuilder: (_, _) => const NoTransitionPage(
              child: SettingsScreen(),
            ),
          ),
        ],
      ),
    ],
  );
});
