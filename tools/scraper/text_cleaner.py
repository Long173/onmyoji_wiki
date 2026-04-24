"""Làm sạch văn bản extract từ HTML WordPress.

Các lỗi thường gặp từ nguồn `onmyojicltl.wordpress.com`:
- Cặp từ tiếng Việt dính chặt (typo trong bài gốc): "sốsát", "kỹnăng"...
- Khoảng trắng thừa, dấu chấm không có space sau.
- camelCase do text mix `<strong>` và `<em>`.

Module có 2 lớp:
1. Rule auto: regex cho camelCase + punctuation.
2. Dictionary override: danh sách lỗi đã biết, mở rộng tự do.
"""

from __future__ import annotations

import re

# Dictionary các lỗi dính chữ đã quan sát được. Mỗi phần tử là (pattern, replacement).
# Thứ tự quan trọng: pattern dài sửa trước pattern ngắn.
GLUE_FIXES: list[tuple[str, str]] = [
    ("Hệ sốsát", "Hệ số sát"),
    ("hệ sốsát", "hệ số sát"),
    ("sốsát", "số sát"),
    ("Hệ sốst", "Hệ số sát"),
    ("hệ sốst", "hệ số sát"),
]

# Regex tách camelCase — chỉ dùng ASCII để tránh range tiếng Việt
# `À-Ỹ` (U+00C0..U+1EF8) chứa nhiều chữ thường nên dùng sẽ sai (ví dụ 'ố'
# bị coi là uppercase). Thay vào đó kiểm tra .islower()/.isupper() trong
# hàm thay thế sẽ tin cậy hơn, nhưng với phạm vi glue ASCII↔ASCII thì regex
# thuần đủ dùng và rẻ.
_RE_CAMEL = re.compile(r"([a-z])([A-Z])")

# Dấu câu không có space sau (trừ dấu chấm — hay dính vào số thập phân)
_RE_PUNCT_NO_SPACE = re.compile(r"([,;:!?])(\S)")

# Nhiều khoảng trắng liền nhau
_RE_WS = re.compile(r"\s+")


def clean_text(raw: str) -> str:
    """Làm sạch một đoạn text. Idempotent (gọi nhiều lần cho cùng kết quả)."""
    if not raw:
        return raw

    text = raw

    # 1) Dictionary fix — sửa những chỗ glue đã biết TRƯỚC khi regex xử lý
    for pattern, replacement in GLUE_FIXES:
        text = text.replace(pattern, replacement)

    # 2) Tách camelCase — "dụngKỹ" → "dụng Kỹ"
    text = _RE_CAMEL.sub(r"\1 \2", text)

    # 3) Thêm space sau dấu câu
    text = _RE_PUNCT_NO_SPACE.sub(r"\1 \2", text)

    # 4) Gộp khoảng trắng thừa
    text = _RE_WS.sub(" ", text).strip()

    return text
