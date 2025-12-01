import { useEffect, useState } from 'react';
import { websocketService } from '@/services/websocket';
import { Wifi, WifiOff } from 'lucide-react';

export function ConnectionStatus() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    setConnected(websocketService.isConnected());
    
    const unsubscribe = websocketService.onStatusChange((status) => {
      setConnected(status);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div className="flex items-center gap-2">
      {connected ? (
        <>
          <div className="h-2 w-2 rounded-full bg-status-connected animate-pulse-slow" />
          <Wifi className="h-4 w-4 text-status-connected" />
        </>
      ) : (
        <>
          <div className="h-2 w-2 rounded-full bg-status-error" />
          <WifiOff className="h-4 w-4 text-status-error" />
        </>
      )}
    </div>
  );
}
