export interface MeditationSessionJson {
  id: string;
  timestamp: string;
  durationMinutes: number;
}

export class MeditationSession {
  public readonly id: string;
  public readonly timestamp: Date;
  public readonly durationMinutes: number;

  constructor({
    id,
    timestamp,
    durationMinutes,
  }: {
    id: string;
    timestamp: Date;
    durationMinutes: number;
  }) {
    this.id = id;
    this.timestamp = timestamp;
    this.durationMinutes = durationMinutes;
  }

  public toJson(): MeditationSessionJson {
    return {
      id: this.id,
      timestamp: this.timestamp.toISOString(),
      durationMinutes: this.durationMinutes,
    };
  }

  public static fromJson(json: Record<string, unknown>): MeditationSession {
    const id = typeof json.id === 'string' && json.id ? json.id : `${Date.now()}_${Math.random()}`;
    const timestamp = new Date(json.timestamp as string);
    if (Number.isNaN(timestamp.getTime())) {
      throw new Error('Invalid timestamp');
    }
    const durationMinutes =
      typeof json.durationMinutes === 'number' ? Math.floor(json.durationMinutes) : 0;

    return new MeditationSession({
      id,
      timestamp,
      durationMinutes,
    });
  }
}

type StatsListener = () => void;

export class StatsService {
  private static _instance: StatsService | null = null;

  public static get instance(): StatsService {
    if (!StatsService._instance) {
      StatsService._instance = new StatsService();
    }
    return StatsService._instance;
  }

  private static readonly STORAGE_KEY = 'meditation_sessions_history';

  private _sessions: MeditationSession[] = [];
  private _isLoaded = false;
  private _listeners: Set<StatsListener> = new Set();

  private constructor() {}

  public get isLoaded(): boolean {
    return this._isLoaded;
  }

  public get sessions(): readonly MeditationSession[] {
    return [...this._sessions];
  }

  public addListener(listener: StatsListener): void {
    this._listeners.add(listener);
  }

  public removeListener(listener: StatsListener): void {
    this._listeners.delete(listener);
  }

  private notifyListeners(): void {
    for (const listener of this._listeners) {
      listener();
    }
  }

  public async getSessions(): Promise<readonly MeditationSession[]> {
    if (!this._isLoaded) {
      await this.loadSessions();
    }
    return [...this._sessions];
  }

  public async loadSessions(): Promise<void> {
    try {
      const raw = localStorage.getItem(StatsService.STORAGE_KEY);
      if (raw) {
        const jsonList = JSON.parse(raw) as unknown[];
        if (Array.isArray(jsonList)) {
          this._sessions = jsonList
            .map((item) => {
              try {
                const obj = typeof item === 'string' ? JSON.parse(item) : item;
                return MeditationSession.fromJson(obj as Record<string, unknown>);
              } catch {
                return null;
              }
            })
            .filter((s): s is MeditationSession => s !== null);
          // Sort newest first
          this._sessions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        } else {
          this._sessions = [];
        }
      } else {
        this._sessions = [];
      }
    } catch {
      this._sessions = [];
    } finally {
      this._isLoaded = true;
      this.notifyListeners();
    }
  }

  public async recordSession(durationMinutes: number, timestamp?: Date): Promise<void> {
    if (durationMinutes <= 0) return;

    const session = new MeditationSession({
      id: `${Date.now()}_${durationMinutes}`,
      timestamp: timestamp ?? new Date(),
      durationMinutes,
    });

    if (!this._isLoaded) {
      await this.loadSessions();
    }

    this._sessions.unshift(session);

    try {
      const jsonList = this._sessions.map((s) => JSON.stringify(s.toJson()));
      localStorage.setItem(StatsService.STORAGE_KEY, JSON.stringify(jsonList));
    } catch {
      // Ignore storage errors
    }

    this.notifyListeners();
  }

  public async clearAllSessions(): Promise<void> {
    this._sessions = [];
    try {
      localStorage.removeItem(StatsService.STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
    this.notifyListeners();
  }

  public static normalizeDate(dt: Date): Date {
    return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  }

  public static dateKey(dt: Date): string {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  public static isNextDay(first: Date, second: Date): boolean {
    const next = new Date(first.getFullYear(), first.getMonth(), first.getDate() + 1);
    return (
      next.getFullYear() === second.getFullYear() &&
      next.getMonth() === second.getMonth() &&
      next.getDate() === second.getDate()
    );
  }

  public static calculateCurrentStreak(
    sessions: readonly MeditationSession[],
    referenceDate?: Date
  ): number {
    if (sessions.length === 0) return 0;

    const today = StatsService.normalizeDate(referenceDate ?? new Date());
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);

    const sessionDayKeys = new Set<string>(
      sessions.map((s) => StatsService.dateKey(StatsService.normalizeDate(s.timestamp)))
    );

    let checkDate: Date;
    if (sessionDayKeys.has(StatsService.dateKey(today))) {
      checkDate = today;
    } else if (sessionDayKeys.has(StatsService.dateKey(yesterday))) {
      checkDate = yesterday;
    } else {
      return 0;
    }

    let streak = 0;
    while (sessionDayKeys.has(StatsService.dateKey(checkDate))) {
      streak++;
      checkDate = new Date(
        checkDate.getFullYear(),
        checkDate.getMonth(),
        checkDate.getDate() - 1
      );
    }

    return streak;
  }

  public static calculateBestStreak(sessions: readonly MeditationSession[]): number {
    if (sessions.length === 0) return 0;

    const uniqueMap = new Map<string, Date>();
    for (const s of sessions) {
      const norm = StatsService.normalizeDate(s.timestamp);
      uniqueMap.set(StatsService.dateKey(norm), norm);
    }

    const sortedDays = Array.from(uniqueMap.values()).sort(
      (a, b) => a.getTime() - b.getTime()
    );

    if (sortedDays.length === 0) return 0;

    let maxStreak = 1;
    let currentStreak = 1;

    for (let i = 0; i < sortedDays.length - 1; i++) {
      if (StatsService.isNextDay(sortedDays[i], sortedDays[i + 1])) {
        currentStreak++;
        if (currentStreak > maxStreak) {
          maxStreak = currentStreak;
        }
      } else {
        currentStreak = 1;
      }
    }

    return maxStreak;
  }

  public static calculateTotalMinutes(sessions: readonly MeditationSession[]): number {
    return sessions.reduce((total, s) => total + s.durationMinutes, 0);
  }

  public static getDailyMinutesMap(
    sessions: readonly MeditationSession[]
  ): Map<string, number> {
    const map = new Map<string, number>();
    for (const s of sessions) {
      const key = StatsService.dateKey(StatsService.normalizeDate(s.timestamp));
      map.set(key, (map.get(key) ?? 0) + s.durationMinutes);
    }
    return map;
  }

  public static formatDuration(totalMinutes: number): string {
    if (totalMinutes < 60) {
      return `${totalMinutes} min`;
    }
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (minutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${minutes}m`;
  }
}
