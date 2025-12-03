// src/components/ParkCard.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { apiService } from "@/services/api";
import type { ParkDashboardView } from "@/lib/telemetryTransform";
import { DASHBOARD_LABELS } from "@/lib/telemetryTransform";
import React from "react";

export default function ParkCard({ park }: { park: ParkDashboardView }) {
  console.log("ParkCard received telemetry update for", park.name, park.metrics.cmdSetpointKw);

  const { isSuperuser } = useAuth();
  const canWrite = true;

  const m = park.metrics;

  /* -------------------------------------------------------
     OPTIMISTIC UI STATE FOR INSTANT CUTOFF
  ------------------------------------------------------- */
  const [pendingCutoff, setPendingCutoff] = useState<boolean | null>(null);

  useEffect(() => {
    if (pendingCutoff === null) return;
    if (m.cmdInstantCutoff === pendingCutoff) {
      setPendingCutoff(null);
    }
  }, [m.cmdInstantCutoff, pendingCutoff]);

  /* -------------------------------------------------------
     GENERIC WRITE WRAPPER
  ------------------------------------------------------- */
  async function write(node: string, value: any): Promise<boolean> {
    try {
      await apiService.writeValue({
        plc_url: park.url,
        node_name: node,
        value,
      });
      toast.success("Command sent");
      return true;
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
      return false;
    }
  }

  const statusColor =
    park.status === "CONNECTED"
      ? "bg-green-500"
      : park.status === "ERROR"
      ? "bg-red-500"
      : "bg-yellow-500";

  const effectiveCutoff = pendingCutoff ?? (m.cmdInstantCutoff ?? false);
  const isCutoffPending = pendingCutoff !== null;

  return (
    <Card className="shadow-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-semibold">{park.name}</CardTitle>
        <Badge className={`text-white ${statusColor}`}>{park.status}</Badge>
      </CardHeader>

      <CardContent className="grid grid-cols-2 gap-4 text-sm">
        {/* -------- Measurements -------- */}
        <Metric label={DASHBOARD_LABELS.activePower} value={m.activePowerKw} unit="kW" />
        <Metric label={DASHBOARD_LABELS.reactivePower} value={m.reactivePowerKvar} unit="kVAr" />
        <Metric label={DASHBOARD_LABELS.avgCurrent} value={m.avgCurrentA} unit="A" />
        <Metric label={DASHBOARD_LABELS.avgVoltage} value={m.avgVoltageKv} unit="kV" />
        <Metric label={DASHBOARD_LABELS.frequency} value={m.frequencyHz} unit="Hz" />
        <Metric label={DASHBOARD_LABELS.powerFactor} value={m.powerFactor} />
        <Metric label={DASHBOARD_LABELS.maxCapacity} value={m.maxProductionCapacity} />

        {/* -------- CB Status -------- */}
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">{DASHBOARD_LABELS.cbStatus}</span>
          <span className="font-medium">{m.cbStatus}</span>
        </div>

        {/* -------- Write/Commands -------- */}
        {canWrite && (
          <>
            <OptimisticSetpoint
              label={DASHBOARD_LABELS.setpointKw}
              node="CMD_Active_Power_Setpoint_kW"
              telemetryValue={m.cmdSetpointKw}
              unit="kW"
              onSend={write}
            />

            {/* ---- PERCENT SETPOINT WITH RANGE CHECK ---- */}
            <OptimisticSetpoint
              label={DASHBOARD_LABELS.setpointPct}
              node="CMD_Active_Power_Setpoint_%"
              telemetryValue={m.cmdSetpointPercent}
              unit="%"
              onSend={async (node, value) => {
                if (value < 0 || value > 100) {
                  toast.error("Value must be between 0 and 100%");
                  return false;
                }
                return write(node, value);
              }}
            />

            {/* -------- Instant Cutoff -------- */}
            <div className="col-span-2 flex items-center justify-between bg-muted/30 px-3 py-2 rounded-lg border border-border/40">
              <div className="flex flex-col">
                <span className="text-base font-semibold text-muted-foreground tracking-wide">
                  {DASHBOARD_LABELS.cutoff}
                </span>
                {isCutoffPending && (
                  <span className="text-xs text-amber-500">Pending confirmation…</span>
                )}
              </div>

              <Switch
                checked={effectiveCutoff}
                disabled={isCutoffPending}
                onCheckedChange={(checked) => {
                  const desired = checked;

                  const payload = desired
                    ? [false, true]
                    : [true, false];

                  setPendingCutoff(desired);

                  void write("CMD_Instant_Cutoff", payload).then((ok) => {
                    if (!ok) setPendingCutoff(null);
                  });
                }}
                className="scale-110"
              />
            </div>
          </>
        )}

        {/* -------- View Details -------- */}
        <div className="col-span-2">
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() =>
              (window.location.href = `/telemetry?park=${encodeURIComponent(park.url)}`)
            }
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------
   METRIC DISPLAY
------------------------------------------------------- */
function Metric({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null;
  unit?: string;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">
        {value ?? "—"} {value !== null && unit ? unit : ""}
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   OPTIMISTIC SETPOINT INPUT
------------------------------------------------------- */
function OptimisticSetpoint({
  label,
  node,
  telemetryValue,
  onSend,
  unit,
}: {
  label: string;
  node: string;
  telemetryValue: number | null;
  onSend: (node: string, value: any) => Promise<boolean>;
  unit?: string;
}) {
  const [value, setValue] = React.useState(telemetryValue ?? 0);
  const [pending, setPending] = React.useState(false);

  useEffect(() => {
    if (!pending) {
      setValue(telemetryValue ?? 0);
    }
  }, [telemetryValue, pending]);

  return (
    <div className="flex flex-col space-y-1 col-span-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex gap-2">
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="border rounded p-1 w-full bg-background"
        />
        {unit && <span className="self-center text-xs">{unit}</span>}
        <Button
          size="sm"
          disabled={pending}
          onClick={() => {
            setPending(true);

            onSend(node, value).then((ok) => {
              if (!ok) {
                setPending(false);
                return;
              }

              setTimeout(() => {
                setPending(false);
              }, 500);
            });
          }}
        >
          Apply
        </Button>
      </div>

      {pending && (
        <span className="text-xs text-amber-500 mt-[-4px]">Pending confirmation…</span>
      )}
    </div>
  );
}
