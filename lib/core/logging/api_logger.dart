import 'dart:developer' as developer;

import 'package:flutter/foundation.dart';

/// Lightweight structured logger for outgoing API calls and sync lifecycle
/// events.
///
/// Output goes through `dart:developer` so it shows in:
///   - the `flutter run` console (prefixed by name + timestamp)
///   - Flutter DevTools → Logging tab (with structured `name` filter)
///
/// Auto-disabled in release builds via [kDebugMode] to avoid leaking timings
/// to production users.
class ApiLogger {
  const ApiLogger._();

  static const String _name = 'wiki.api';

  /// Logs a Supabase REST `select` call.
  /// Pair calls: [start] returns a `Stopwatch`, pass back to [success]/[failure].
  static Stopwatch start(String table, {Map<String, Object?>? extra}) {
    if (!kDebugMode) return Stopwatch();
    final sw = Stopwatch()..start();
    _log('→ $table   ${_kv(extra)}');
    return sw;
  }

  static void success(
    Stopwatch sw,
    String table, {
    required int rowCount,
    Map<String, Object?>? extra,
  }) {
    if (!kDebugMode) return;
    sw.stop();
    _log('✓ $table   ${sw.elapsedMilliseconds}ms   rows=$rowCount   ${_kv(extra)}');
  }

  static void failure(
    Stopwatch sw,
    String table,
    Object error, {
    StackTrace? stackTrace,
  }) {
    if (!kDebugMode) return;
    sw.stop();
    developer.log(
      '✗ $table   ${sw.elapsedMilliseconds}ms   error=$error',
      name: _name,
      level: 1000, // SEVERE
      error: error,
      stackTrace: stackTrace,
    );
  }

  /// Generic info-level event (sync lifecycle, cache hits, etc.).
  static void event(String message, {Map<String, Object?>? extra}) {
    if (!kDebugMode) return;
    _log('• $message   ${_kv(extra)}');
  }

  static void _log(String message) {
    developer.log(message, name: _name);
  }

  static String _kv(Map<String, Object?>? m) {
    if (m == null || m.isEmpty) return '';
    return m.entries
        .where((e) => e.value != null)
        .map((e) => '${e.key}=${e.value}')
        .join(' ');
  }
}
