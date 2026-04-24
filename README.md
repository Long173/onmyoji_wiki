# Onmyoji Wiki VN

Ứng dụng wiki tiếng Việt cho game **Onmyoji** — tra cứu Thức Thần, Ngự hồn, lưu danh sách yêu thích.
Android + iOS. Offline-first (dữ liệu JSON đóng gói trong `assets/`).

## Chạy nhanh

```bash
flutter pub get
flutter run               # chọn thiết bị Android/iOS đang có
flutter analyze
flutter test
flutter test --coverage
```

## Cấu trúc dự án

```
lib/
├── app.dart               # MaterialApp.router + theme + locale vi
├── main.dart              # override SharedPreferences cho ProviderScope
├── core/                  # data loader, router, theme, storage, widgets dùng chung
└── features/
    ├── shell/             # bottom nav shell
    ├── shikigami/         # danh sách + chi tiết Thức Thần
    ├── soul/              # danh sách + chi tiết Ngự hồn
    ├── favorites/         # lưu yêu thích bằng shared_preferences
    └── settings/          # trang Khác
assets/
├── data/                  # shikigami.json, souls.json
└── images/                # ảnh Thức Thần, Ngự hồn (.webp)
```

## Dữ liệu

- **`assets/data/shikigami.json`** — 10 Thức Thần mẫu (Seimei, Ibaraki, Shuten, …). Schema xem inline trong file.
- **`assets/data/souls.json`** — 10 bộ Ngự hồn phổ biến (Shiranui, Tỳ Bà, Phá Thế, …).
- Mỗi record có `id`, `name_vi`, `name_jp`, `name_en`, rarity, mô tả, kỹ năng, lore, ngự hồn đề xuất.
- **Lưu ý**: số liệu + mô tả là placeholder — bạn cần rà soát lại để chính xác với phiên bản game.

### Thêm/ sửa dữ liệu

1. Mở `assets/data/shikigami.json` hoặc `souls.json`, thêm object mới theo schema có sẵn.
2. Thêm ảnh tương ứng vào `assets/images/shikigami/{id}.webp` hoặc `assets/images/souls/{id}.webp`.
3. Mở `pubspec.yaml`, bỏ comment 2 dòng `# - assets/images/shikigami/` và `# - assets/images/souls/` khi đã có ảnh.
4. `flutter pub get` và chạy lại app.

## Launcher icon & splash (sau khi có logo)

Khi đã có file `assets/branding/icon.png` (1024×1024, nền trong suốt) và `assets/branding/splash.png`:

```yaml
# thêm vào pubspec.yaml rồi chạy:
#   dart run flutter_launcher_icons
#   dart run flutter_native_splash:create
flutter_launcher_icons:
  android: true
  ios: true
  image_path: "assets/branding/icon.png"
  adaptive_icon_background: "#0F0D0C"
  adaptive_icon_foreground: "assets/branding/icon_fg.png"

flutter_native_splash:
  color: "#0F0D0C"
  image: assets/branding/splash.png
  android_12:
    color: "#0F0D0C"
    image: assets/branding/splash.png
```

## Golden path test thủ công

1. Mở app → tab **Thức Thần** → thấy grid.
2. Gõ `ibaraki` (hoặc `ibaraki đồng tử`) → ra kết quả. Thử gõ không dấu cũng khớp.
3. Tap card → xem Tabs: Thông tin / Kỹ năng / Ngự hồn / Truyện.
4. Tab **Ngự hồn** đề xuất → tap → nhảy sang Soul detail.
5. Tym → tab **Yêu thích** → thấy item.
6. Kill app → mở lại → vẫn còn trong Yêu thích.

## Ngăn xếp công nghệ

- Flutter · Dart ^3.11
- State: `flutter_riverpod`
- Routing: `go_router`
- Local storage: `shared_preferences`
- Responsive: `flutter_screenutil`
- Font: Be Vietnam Pro (`google_fonts`)
- Search: `diacritic` (bỏ dấu tìm kiếm)

Không dùng Firebase / backend trong MVP — toàn bộ dữ liệu bundled offline.
