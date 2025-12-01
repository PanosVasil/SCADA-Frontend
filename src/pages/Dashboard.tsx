// src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { apiService } from "@/services/api";
import { websocketService } from "@/services/websocket";
import ParkCard from "@/components/ParkCard";
import { plcClientToDashboardView } from "@/lib/telemetryTransform";
import type { TelemetryData } from "@/types/api";
import { toast } from "sonner";

export default function Dashboard() {
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInitial() {
      try {
        const data = await apiService.getTelemetryData();
        setTelemetry(data);
      } catch {
        toast.error("Failed to load telemetry");
      } finally {
        setLoading(false);
      }
    }

    loadInitial();

    const unsub = websocketService.onMessage((msg) => {
      if (msg.type === "telemetry_update") {
        setTelemetry(msg.data);
      }
    });

    // Ensure the cleanup returns void
    return () => {
      unsub();
    };
  }, []);

  if (loading || !telemetry) {
    return (
      <div className="flex justify-center items-center h-40 text-muted-foreground">
        Loading…
      </div>
    );
  }

  const cards = telemetry.plc_clients.map((client) =>
    plcClientToDashboardView(client),
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((v) => (
          <ParkCard key={v.id} park={v} />
        ))}
      </div>
    </div>
  );
}
