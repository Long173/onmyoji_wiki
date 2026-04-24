import 'package:flutter/material.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Khác')),
      body: ListView(
        children: [
          const _SectionLabel('Giới thiệu'),
          ListTile(
            leading: const Icon(Icons.info_outline),
            title: const Text('Về Onmyoji Wiki VN'),
            subtitle: Text(
              'Ứng dụng cộng đồng dành cho người chơi Onmyoji Việt Nam.',
              style: theme.textTheme.bodySmall,
            ),
          ),
          ListTile(
            leading: const Icon(Icons.code_outlined),
            title: const Text('Phiên bản'),
            subtitle: const Text('1.0.0'),
          ),
          const Divider(height: 32),
          const _SectionLabel('Đóng góp'),
          const ListTile(
            leading: Icon(Icons.favorite_outline),
            title: Text('Sửa/bổ sung dữ liệu'),
            subtitle: Text('Dữ liệu JSON mở, cộng đồng có thể đóng góp.'),
          ),
        ],
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
      child: Text(
        text.toUpperCase(),
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              letterSpacing: 1.2,
              color: Theme.of(context).colorScheme.primary,
            ),
      ),
    );
  }
}
