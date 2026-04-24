import 'package:diacritic/diacritic.dart';

String normalizeForSearch(String input) {
  return removeDiacritics(input).toLowerCase().trim();
}

bool matchesQuery(String query, Iterable<String> haystacks) {
  final q = normalizeForSearch(query);
  if (q.isEmpty) return true;
  for (final h in haystacks) {
    if (normalizeForSearch(h).contains(q)) return true;
  }
  return false;
}
