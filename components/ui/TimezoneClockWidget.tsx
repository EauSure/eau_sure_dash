'use client';

import { useEffect, useRef, useState } from 'react';
import { useDateFormat } from '@/lib/hooks/useDateFormat';
import { useTimeFormat } from '@/lib/hooks/useTimeFormat';

interface Props {
  timezone: string;
  locale: string;
}

function safeTimeZone(timezone: string) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return timezone;
  } catch {
    return 'UTC';
  }
}

function getTimeZoneAbbreviation(locale: string, timezone: string, date: Date) {
  try {
    return (
      new Intl.DateTimeFormat(locale, {
        timeZone: timezone,
        timeZoneName: 'short',
      })
        .formatToParts(date)
        .find((part) => part.type === 'timeZoneName')?.value ?? timezone
    );
  } catch {
    return 'UTC';
  }
}

export function TimezoneClockWidget({ timezone, locale }: Props) {
  const [time, setTime] = useState<Date>(new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resolvedTimeZone = safeTimeZone(timezone);
  const { formatDate } = useDateFormat();
  const { formatTime } = useTimeFormat();

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const timeString = formatTime(time, true);
  const dateString = formatDate(time);

  const tzAbbr = getTimeZoneAbbreviation(locale, resolvedTimeZone, time);

  return (
    <div
      style={{
        borderInlineStart: '3px solid var(--color-border-info, var(--primary))',
        paddingInlineStart: '1rem',
        borderRadius: 0,
      }}
    >
      <p
        style={{
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--color-text-tertiary, var(--muted-foreground))',
          margin: 0,
        }}
      >
        {tzAbbr} - {resolvedTimeZone}
      </p>
      <p
        style={{
          fontSize: '28px',
          fontWeight: 900,
          color: 'var(--color-text-primary, var(--foreground))',
          margin: '2px 0',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.02em',
        }}
      >
        {timeString}
      </p>
      <p
        style={{
          fontSize: '13px',
          color: 'var(--color-text-secondary, var(--muted-foreground))',
          margin: 0,
        }}
      >
        {dateString}
      </p>
    </div>
  );
}
