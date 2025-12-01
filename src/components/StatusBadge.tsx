import { Badge } from '@/components/ui/badge';
import type { PLCClient } from '@/types/api';

interface StatusBadgeProps {
  status: PLCClient['status'];
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const variants = {
    CONNECTED: 'bg-status-connected text-white',
    DISCONNECTED: 'bg-status-disconnected text-white',
    ERROR: 'bg-status-error text-white'
  };

  return (
    <Badge className={variants[status]}>
      {status}
    </Badge>
  );
}
