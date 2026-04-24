import 'dart:convert';

import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter_riverpod/flutter_riverpod.dart';

class JsonLoader {
  const JsonLoader();

  Future<List<Map<String, dynamic>>> loadList(String assetPath) async {
    final raw = await rootBundle.loadString(assetPath);
    final decoded = jsonDecode(raw);
    if (decoded is! List) {
      throw FormatException(
        'Expected a JSON array at $assetPath, got ${decoded.runtimeType}',
      );
    }
    return decoded
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList(growable: false);
  }
}

final jsonLoaderProvider = Provider<JsonLoader>((ref) => const JsonLoader());
