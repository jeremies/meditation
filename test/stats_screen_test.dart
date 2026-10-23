import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:meditation/stats_screen.dart';
import 'package:meditation/stats_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('StatsScreen renders cards and heatmap', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});
    await StatsService.instance.loadSessions();

    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: StatsScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Current Streak'), findsOneWidget);
    expect(find.text('Best Streak'), findsOneWidget);
    expect(find.text('Total Time'), findsOneWidget);
    expect(find.text('Total Sessions'), findsOneWidget);
    expect(find.text('Meditation Activity'), findsOneWidget);
    expect(find.text('Recent Sessions'), findsOneWidget);
  });
}

