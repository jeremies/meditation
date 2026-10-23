import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_settings_screens/flutter_settings_screens.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:get_it/get_it.dart';
import 'package:meditation/audioplayer.dart';
import 'package:meditation/settings.dart';
import 'package:meditation/stats_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() async {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
      const MethodChannel('xyz.luan/audioplayers'),
      (MethodCall methodCall) async {
        return '1';
      },
    );
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
      const MethodChannel('xyz.luan/audioplayers.global'),
      (MethodCall methodCall) async {
        return '1';
      },
    );

    SharedPreferences.setMockInitialValues({});
    await Settings.init();
    if (!GetIt.I.isRegistered<NAudioPlayer>()) {
      GetIt.I.registerSingleton<NAudioPlayer>(NAudioPlayer());
    }
  });

  testWidgets('Clear meditation history dialog cancels and clears correctly',
      (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});
    final stats = StatsService.instance;
    await stats.recordSession(20);
    expect(stats.sessions.length, 1);

    await tester.pumpWidget(
      const MaterialApp(
        home: SettingsWidget(),
      ),
    );
    await tester.pumpAndSettle();

    // Scroll to the bottom to bring Danger Zone into view
    final clearTileFinder = find.text('Clear meditation history');
    await tester.drag(find.byType(ListView), const Offset(0, -600));
    await tester.pumpAndSettle();
    expect(clearTileFinder, findsOneWidget);
    expect(find.text('DANGER ZONE'), findsOneWidget);
    expect(find.byIcon(Icons.delete_forever), findsOneWidget);

    // Tap to open confirmation dialog
    await tester.tap(clearTileFinder);
    await tester.pumpAndSettle();

    // Verify dialog contents
    expect(find.text('Clear meditation history?'), findsOneWidget);
    expect(
        find.text(
            'Are you sure you want to delete all session logs? This action cannot be undone and will reset your streaks and statistics.'),
        findsOneWidget);
    expect(find.text('Cancel'), findsOneWidget);
    expect(find.text('Clear'), findsOneWidget);

    // Tap Cancel
    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();

    // Verify session still exists
    expect(stats.sessions.length, 1);
    expect(find.text('Clear meditation history?'), findsNothing);

    // Tap again and confirm Clear
    await tester.tap(clearTileFinder);
    await tester.pumpAndSettle();

    await tester.tap(find.text('Clear'));
    await tester.pumpAndSettle();

    // Verify sessions cleared and SnackBar shown
    expect(stats.sessions, isEmpty);
    expect(find.text('All meditation history has been cleared'), findsOneWidget);
  });
}
