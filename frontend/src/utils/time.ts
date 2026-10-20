/**
 * Utility functions for local time formatting.
 * Ensures timestamps match the user device's local timezone (e.g. UTC+7 in Vietnam).
 */

/**
 * Formats a time string into 24-hour format "HH:mm" based on the user's local device timezone.
 *
 * @param timeStr Preformatted time or relative string from backend (e.g. "Vừa xong", "10:02")
 * @param rawIso Standard ISO 8601 string in UTC (e.g. "2026-09-29T03:02:00.123456Z")
 */
export function formatDisplayTime(timeStr?: string, rawIso?: string): string {
  // If raw ISO timestamp with timezone is available, parse into user's device local timezone
  if (rawIso) {
    try {
      const normalizedIso = rawIso.endsWith('Z') || rawIso.includes('+') || rawIso.includes('-')
        ? rawIso
        : `${rawIso}Z`;
      const date = new Date(normalizedIso);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
      }
    } catch {
      // fallback
    }
  }

  // If timeStr is already a relative time or formatted, return it
  if (timeStr) {
    return timeStr;
  }

  return '';
}

/**
 * Formats a datetime string into "HH:mm • DD/MM" or "DD/MM/YYYY HH:mm" based on local device timezone.
 */
export function formatDisplayDateTime(
  fallbackStr?: string,
  rawIso?: string,
  includeYear: boolean = false
): string {
  if (rawIso) {
    try {
      const normalizedIso = rawIso.endsWith('Z') || rawIso.includes('+') || rawIso.includes('-')
        ? rawIso
        : `${rawIso}Z`;
      const date = new Date(normalizedIso);
      if (!isNaN(date.getTime())) {
        const timePart = date.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        const datePart = date.toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          ...(includeYear ? { year: 'numeric' } : {}),
        });
        return `${timePart} • ${datePart}`;
      }
    } catch {
      // fallback
    }
  }

  return fallbackStr || '';
}

/**
 * Formats date part "DD/MM/YYYY" based on local device timezone.
 */
export function formatDisplayDate(fallbackStr?: string, rawIso?: string): string {
  if (rawIso) {
    try {
      const normalizedIso = rawIso.endsWith('Z') || rawIso.includes('+') || rawIso.includes('-')
        ? rawIso
        : `${rawIso}Z`;
      const date = new Date(normalizedIso);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
      }
    } catch {
      // fallback
    }
  }

  return fallbackStr || '';
}
