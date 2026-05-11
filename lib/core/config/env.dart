import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Typed access to `.env` values. Loaded once in `main()` via
/// `Env.load()` before runApp.
class Env {
  const Env._();

  /// Call once on startup. Throws [EnvNotConfigured] if required keys are
  /// missing, so the app fails fast with a clear message rather than 401-ing
  /// on every request later.
  static Future<void> load({String fileName = '.env'}) async {
    await dotenv.load(fileName: fileName);
    _require('SUPABASE_URL');
    _require('SUPABASE_ANON_KEY');
  }

  static String get supabaseUrl => _require('SUPABASE_URL');
  static String get supabaseAnonKey => _require('SUPABASE_ANON_KEY');

  /// Public CDN base for files in the `assets` bucket. Storage URLs follow
  /// the pattern `{supabaseUrl}/storage/v1/object/public/assets/<path>`.
  static String get storagePublicBase =>
      '${supabaseUrl.replaceAll(RegExp(r'/+$'), '')}'
      '/storage/v1/object/public/assets';

  static String _require(String key) {
    final v = dotenv.maybeGet(key);
    if (v == null || v.isEmpty) {
      throw EnvNotConfigured(key);
    }
    return v;
  }
}

class EnvNotConfigured implements Exception {
  EnvNotConfigured(this.key);

  final String key;

  @override
  String toString() =>
      'EnvNotConfigured: missing $key in .env. '
      'Copy .env.example → .env and fill in the Supabase project credentials.';
}
