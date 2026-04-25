# Onmyoji Wiki VN — Context Handoff

Doc này tóm tắt trạng thái dự án để Claude Code (hoặc bất kỳ ai) có thể tiếp tục
công việc trên máy khác. Đọc file này trước khi sửa code.

## Project goal
App wiki Tiếng Việt cho game **Onmyoji** (NetEase). Offline-first; Android + iOS.
- Repo: `git@github.com:Long173/onmyoji_wiki.git`
- Branch chính: `main`
- Working dir mong đợi: `~/Project/personal/onmyoji_wiki`

## Stack
- **Flutter 3.41.5** / **Dart 3.11**
- State: `flutter_riverpod` (StateNotifier pattern, không codegen)
- Routing: `go_router` (ShellRoute, 4 tab bottom nav)
- Local: `shared_preferences` (override qua `sharedPreferencesProvider` ở `main.dart`)
- Search: `diacritic` (bỏ dấu tiếng Việt)
- Font: `BeVietnamPro` bundle local (không dùng `google_fonts` runtime fetch)
- KHÔNG dùng: bloc, freezed, json_serializable, dio, firebase

## Layout
```
lib/
├── main.dart, app.dart                # entry + MaterialApp.router
├── core/
│   ├── constants/asset_paths.dart     # path helpers (rarityIcon, shikigamiImage, ...)
│   ├── data/json_loader.dart          # rootBundle JSON loader (testable)
│   ├── router/app_router.dart         # 4 routes: shikigami / souls / effects / settings
│   ├── storage/prefs_service.dart     # SharedPreferences provider
│   ├── theme/{app_colors,app_theme}.dart
│   ├── utils/search_utils.dart        # normalize + matchesQuery (diacritic-insensitive)
│   └── widgets/{empty_state,rarity_badge,asset_image_placeholder}.dart
└── features/
    ├── shell/                         # bottom nav shell
    ├── shikigami/                     # Thức Thần (chính)
    │   ├── models/{shikigami,skill}.dart
    │   ├── repositories/shikigami_repository.dart   # đọc 5 file rarity rồi gộp
    │   ├── providers/shikigami_list_provider.dart   # list/byId/filter
    │   ├── screens/{shikigami_list,shikigami_detail}.dart
    │   └── widgets/{shikigami_card,rarity_filter_bar,skill_section}.dart
    ├── soul/                          # Ngự hồn — kind boss/normal
    ├── effect/                        # Hiệu ứng — kind buff/debuff/other
    └── settings/                      # tab "Khác"

assets/
├── data/
│   ├── shikigami/{ssr,sr,sp,r,n}.json   # 126 record total (chia rarity)
│   ├── souls.json                       # 64 record (57 normal + 7 boss)
│   └── effects.json                     # 83 record (12 buff + 33 debuff + 38 other)
├── images/
│   ├── shikigami/{ssr,sr,sp,r,n}/*.png  # ảnh portrait
│   ├── souls/*.png                      # 64 ảnh
│   ├── effects/*.png                    # 42 icon (Common Terminology không có)
│   ├── skills/{number}.png              # 284 skill icon
│   └── rarity/{ssr,sr,sp,r,n}.png       # 5 rarity badge
└── fonts/BeVietnamPro-{Regular,Medium,SemiBold,Bold}.ttf

tools/scraper/                         # Python scrapers
├── scrape_shikigami.py                # nguồn onmyojicltl.wordpress.com
├── scrape_souls.py                    # nguồn fandom MediaWiki API
├── scrape_effects.py                  # nguồn fandom Skill_Effects
├── enrich_shikigami_fandom.py         # merge fandom data vào shikigami (preserve)
├── merge_unmapped.py                  # merge target_id sau khi user duyệt
├── text_cleaner.py                    # clean glue chữ "sốsát" → "số sát"
├── test_text_cleaner.py + test_preserve.py  # python unittest
├── requirements.txt                   # requests, beautifulsoup4
└── README.md

test/                                  # Dart tests (31 pass)
├── unit/{search_utils,shikigami_model,soul_model,effect_model,filtered_list,favorites_notifier}_test.dart
└── widget/{shikigami_list_screen,favorite_button}_test.dart
```

## Data schema (rút gọn — xem code Dart cho đầy đủ)

### Shikigami (`assets/data/shikigami/{rarity}.json`)
```json
{
  "id": "tu_kim_than",
  "name_vi": "Tư Kim Thần",
  "name_jp": "Omoikane",
  "name_en": "Omoikane",          // từ fandom
  "friendly_name": [],            // biệt danh VN cộng đồng đặt
  "rarity": "SSR",
  "role": ["support"],            // list — đa vai trò
  "description": "...",
  "obtain": [],
  "stats": {                      // mỗi stat = {value, tier D|C|B|A|S|SS|""}
    "hp":        {"value": 0, "tier": ""},
    "attack":    {"value": 0, "tier": ""},
    "defense":   {"value": 0, "tier": ""},
    "speed":     {"value": 0, "tier": ""},
    "crit_rate": {"value": 0, "tier": ""},
    "crit_dmg":  {"value": 150, "tier": ""},  // default 150 cho crit_dmg
    "accuracy":  {"value": 0, "tier": ""},    // không hiển thị tier
    "resist":    {"value": 0, "tier": ""}     // không hiển thị tier
  },
  "skills": [
    {
      "name": "DIỄM ĐỒ",
      "description": "...",
      "levels": [{"level": 1, "description": "..."}, ...],   // tối đa Lv5
      "image": "assets/images/skills/6001.png",              // skill icon
      "cost": 0
    }
  ],
  "recommended_souls": [],
  "lore": "",
  "image": "assets/images/shikigami/ssr/tu_kim_than.png",
  "source_url": "..."
}
```

### Soul (`assets/data/souls.json`)
- `kind: "normal"` (2pc/4pc effects) hoặc `"boss"` (1pc/2pc effects)
- effects: `[{pieces, description}]`
- KHÔNG có `recommended_for`, `name_jp`, `grade` (đã loại)

### Effect (`assets/data/effects.json`)
- `kind: "buff" | "debuff" | "other"` (other = Common Terminology)
- `name` (VN) + `en_name` (Anh) + `description` + `image`

## Sources
| Data | Source | Method |
|---|---|---|
| Shikigami list/skills VN | `onmyojicltl.wordpress.com` | scrape HTML (BeautifulSoup) |
| Shikigami enrichment | `onmyoji.fandom.com/wiki/Shikigami/List/All` | MediaWiki API |
| Souls (64) | `onmyoji.fandom.com/wiki/Soul/List` + `Boss_Souls` | MediaWiki API |
| Effects (83) | `onmyoji.fandom.com/wiki/Skill_Effects` | MediaWiki API |
| Rarity icons | `onmyoji.fandom.com File:{SSR,SR,SP,R,N}.png` | API |

## Cách chạy scraper
```bash
cd tools/scraper
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Scrape shikigami từ onmyojicltl (VN)
python scrape_shikigami.py                       # full, per-rarity output

# Scrape Soul / Effect từ fandom
python scrape_souls.py
python scrape_effects.py

# Enrich shikigami từ fandom (PRESERVE policy):
python enrich_shikigami_fandom.py --no-create-new   # tạo unmapped_fandom.json
python merge_unmapped.py                            # auto-suggest target_id
# review/sửa unmapped_fandom.json
python merge_unmapped.py --apply                    # idempotent

# Test scraper
python -m unittest test_text_cleaner test_preserve
```

## Conventions / decisions đã chốt
1. **Preserve policy**: scraper KHÔNG bao giờ overwrite field user đã điền.
   Chỉ FILL các field rỗng / default. Có guard test `test_preserve.py`.
2. **Skill description Lv1-Lv5**: mỗi skill có `levels: [{level, description}]`.
   UI hiển thị Lv1 luôn ở trên + selector chip Lv2-Lv5 đổi mô tả nâng cấp.
3. **Stat tiers** D/C/B/A/S/SS — chỉ render badge tier cho 5 stat (HP/ATK/DEF/SPD/Crit);
   crit_dmg/accuracy/resist không có tier.
4. **Rarity sort**: thứ tự trong file JSON = thứ tự trên web nguồn (newest first
   theo ngày đăng). Provider KHÔNG sort lại.
5. **Per-rarity files**: `shikigami.json` chia thành `{ssr,sr,sp,r,n}.json` để dễ
   edit + tránh merge conflict + scraper `--rarity` chỉ đụng 1 file.
6. **Search diacritic-insensitive**: dùng `core/utils/search_utils.normalizeForSearch`.
   Tên VN/JP/EN đều index.
7. **Image path** lưu trực tiếp trong JSON (không tạo runtime — đảm bảo asset bundle
   đúng). `AssetImagePlaceholder` widget có fallback gradient + initials nếu thiếu.
8. **Soul card grid** dùng `childAspectRatio: 0.56` (cao hơn shikigami 0.62 vì có
   nameEn + 2 dòng effect preview).
9. **Header SliverAppBar**: phải set `backgroundColor + surfaceTintColor + foregroundColor`
   ở scheme.surface — `AppBarTheme` global đặt transparent để FlexibleSpace ảnh
   hiển thị đầy đủ khi expand.

## Trạng thái hiện tại (commit f5c856f trên main)
- 126 shikigami (39 enriched + 27 mới từ fandom — collab Demon Slayer/Vocaloid/etc.)
- 64 souls + 83 effects, mô tả đã dịch tiếng Việt
- 31/31 Dart tests + 14 Python tests pass
- `flutter analyze` no issues
- App build OK trên Android (đã test trên TECNO KJ7)

## Open items / có thể làm tiếp
1. **Dịch `name_vi` cho ~27 record mới** từ fandom — đang để rỗng (vd
   `tanjiro_kamado`, `nezuko_kamado`, `izanami`, `asura`, ...). Tìm trong file
   `ssr.json`, `sr.json`, `r.json`, `n.json`, sửa `"name_vi": ""`.
2. **Dịch `description` (lore + skill) cho 27 record mới** — fandom data chỉ có EN.
3. **Per-skill image cho ~75 record onmyojicltl không match fandom** — phải scrape
   thêm hoặc bỏ qua. Hiện UI fallback hiển thị số thứ tự CircleAvatar.
4. **Stats với tier** chưa fill cho ~75 record không match fandom — đang tier rỗng.
5. **Effects image bị thiếu cho 41 Common Terminology entries** — fandom không có
   icon cho các thuật ngữ này. UI dùng `AssetImagePlaceholder` fallback initials.
6. **iOS chưa build/test** — chỉ Android verified.
7. **Launcher icon + splash** chưa làm (cần file source `assets/branding/icon.png`).
8. **Tier list / event calendar / favorites** không có — đã loại khỏi scope MVP.

## Repo state
- HEAD: `f5c856f` `feat: enrich shikigami from fandom wiki + add skill/rarity icons`
- Initial: `aeb673a` `feat: initial Onmyoji Wiki VN app`
- Remote `origin`: `git@github.com:Long173/onmyoji_wiki.git` (SSH, đã auth qua
  `~/.ssh/id_ed25519` trên máy hiện tại — máy mới cần tự setup SSH key)
- Tổng repo size ~232 MB (chủ yếu là 240+ ảnh shikigami + 280+ skill icons)

## Lưu ý cho máy mới
1. Cài Flutter 3.41.5+ tại `~/development/flutter/`
2. Clone repo: `git clone git@github.com:Long173/onmyoji_wiki.git`
3. `flutter pub get`
4. `flutter analyze && flutter test` để verify state
5. Để chạy scraper: setup `tools/scraper/.venv` (xem mục "Cách chạy scraper")
6. Git config user nếu chưa: dùng `-c user.email=... -c user.name=...` hoặc
   `git config --local`. **KHÔNG** sửa global config.
