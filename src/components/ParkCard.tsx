// src/components/ParkCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { apiService } from "@/services/api";
import type { ParkDashboardView } from "@/lib/telemetryTransform";
import { DASHBOARD_LABELS } from "@/lib/telemetryTransform";

export default function ParkCard({ park }: { park: ParkDashboardView }) {
  // Treat park permission as "write-enabled"
  const { isSuperuser } = useAuth();
  const canWrite = true; // <-- user with park access has full rights
  const m = park.metrics;

  // value can be number | boolean | string | boolean[]
  async function write(node: string, value: any) {
    try {
      await apiService.writeValue({
        plc_url: park.url,
        node_name: node,
        value,
      });
      toast.success("Command sent");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  }

  const statusColor =
    park.status === "CONNECTED"
      ? "bg-green-500"
      : park.status === "ERROR"
      ? "bg-red-500"
      : "bg-yellow-500";

  return (
    <Card className="shadow-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-semibold">{park.name}</CardTitle>
        <Badge className={`text-white ${statusColor}`}>{park.status}</Badge>
      </CardHeader>

      <CardContent className="grid grid-cols-2 gap-4 text-sm">
        {/* -------- Measurements -------- */}
        <Metric
          label={DASHBOARD_LABELS.activePower}
          value={m.activePowerKw}
          unit="kW"
        />
        <Metric
          label={DASHBOARD_LABELS.reactivePower}
          value={m.reactivePowerKvar}
          unit="kVAr"
        />
        <Metric
          label={DASHBOARD_LABELS.avgCurrent}
          value={m.avgCurrentA}
          unit="A"
        />
        <Metric
          label={DASHBOARD_LABELS.avgVoltage}
          value={m.avgVoltageKv}
          unit="kV"
        />
        <Metric
          label={DASHBOARD_LABELS.frequency}
          value={m.frequencyHz}
          unit="Hz"
        />
        <Metric
          label={DASHBOARD_LABELS.powerFactor}
          value={m.powerFactor}
        />
        <Metric
          label={DASHBOARD_LABELS.maxCapacity}
          value={m.maxProductionCapacity}
        />

        {/* -------- CB Status -------- */}
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">
            {DASHBOARD_LABELS.cbStatus}
          </span>
          <span className="font-medium">{m.cbStatus}</span>
        </div>

        {/* -------- Write/Commands -------- */}
        {canWrite && (
          <>
            <CommandNumber
              label={DASHBOARD_LABELS.setpointKw}
              value={m.cmdSetpointKw}
              unit="kW"
              onApply={(v) =>
                write("CMD_Active_Power_Setpoint_kW", Number(v))
              }
            />
            <CommandNumber
              label={DASHBOARD_LABELS.setpointPct}
              value={m.cmdSetpointPercent}
              unit="%"
              onApply={(v) =>
                write("CMD_Active_Power_Setpoint_%", Number(v))
              }
            />

            {/* Instant Cutoff – encoded as string "[False, True]" / "[True, False]" */}
            <div className="col-span-2 flex items-center justify-between bg-muted/30 px-3 py-2 rounded-lg border border-border/40">
              <span className="text-base font-semibold text-muted-foreground tracking-wide">
                {DASHBOARD_LABELS.cutoff}
              </span>

              <Switch
                checked={m.cmdInstantCutoff ?? false}
                onCheckedChange={(checked) => {
                  // Real PLC mapping (confirmed by your test):
                  //   [True,  False] -> park ON  (cutoff OFF)
                  //   [False, True]  -> park OFF (cutoff ON)

                  const payload = checked
                    ? [false, true]   // switch ON  -> cutoff ON  -> park OFF
                    : [true, false];  // switch OFF -> cutoff OFF -> park ON

                  write("CMD_Instant_Cutoff", payload);
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
              (window.location.href = `/telemetry?park=${encodeURIComponent(
                park.url
              )}`)
            }
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

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

function CommandNumber({
  label,
  value,
  onApply,
  unit,
}: {
  label: string;
  value: number | null;
  onApply: (v: number) => void;
  unit?: string;
}) {
  let inputValue = value ?? 0;

  return (
    <div className="flex flex-col space-y-1 col-span-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex gap-2">
        <input
          type="number"
          defaultValue={inputValue}
          className="border rounded p-1 w-full bg-background"
          onChange={(e) => {
            inputValue = Number(e.target.value);
          }}
        />
        {unit && <span className="self-center text-xs">{unit}</span>}
        <Button size="sm" onClick={() => onApply(inputValue)}>
          Apply
        </Button>
      </div>
    </div>
  );
}
