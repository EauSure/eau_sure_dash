import type { WaterStatus, AlertSeverity, DeviceState } from '@/types/iot';
import { Badge } from '@/components/ui/badge';

export function WaterStatusBadge({ status }: { status: WaterStatus }) {
  const variants = {
    potable: 'default',
    warning: 'secondary',
    critical: 'destructive',
  } as const;

  const labels = {
    potable: 'Potable',
    warning: 'Warning',
    critical: 'Critical',
  };

  return (
    <Badge variant={variants[status]}>
      {labels[status]}
    </Badge>
  );
}

export function AlertSeverityBadge({ severity }: { severity: AlertSeverity }) {
  const variants = {
    info: 'outline',
    warning: 'secondary',
    critical: 'destructive',
  } as const;

  const labels = {
    info: 'Info',
    warning: 'Warning',
    critical: 'Critical',
  };

  return (
    <Badge variant={variants[severity]}>
      {labels[severity]}
    </Badge>
  );
}

export function DeviceStateBadge({ state }: { state: DeviceState }) {
  const variants = {
    sleeping: 'outline',
    awake: 'default',
    offline: 'secondary',
  } as const;

  const labels = {
    sleeping: 'Sleeping',
    awake: 'Awake',
    offline: 'Offline',
  };

  return (
    <Badge variant={variants[state]}>
      {labels[state]}
    </Badge>
  );
}
