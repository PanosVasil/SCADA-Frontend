// src/lib/telemetryTransform.ts
import type { PLCClient } from "@/types/api";

/* ---------------------------------------------------
   1. LABELS
--------------------------------------------------- */

export type DashboardLabelKey =
  | "activePower"
  | "reactivePower"
  | "avgCurrent"
  | "avgVoltage"
  | "frequency"
  | "powerFactor"
  | "maxCapacity"
  | "cbStatus"
  | "setpointKw"
  | "setpointPct"
  | "cutoff";

export const DEFAULT_DASHBOARD_LABELS: Record<DashboardLabelKey, string> = {
  activePower: "Active Power",
  reactivePower: "Reactive Power",
  avgCurrent: "Current (Avg)",
  avgVoltage: "Voltage (Avg)",
  frequency: "Frequency",
  powerFactor: "Power Factor",
  maxCapacity: "Production Capacity",
  cbStatus: "CB Status",
  setpointKw: "Setpoint (kW)",
  setpointPct: "Setpoint (%)",
  cutoff: "Instant Cutoff",
};

export const DASHBOARD_LABEL_KEYS = Object.keys(
  DEFAULT_DASHBOARD_LABELS
) as DashboardLabelKey[];

export const DASHBOARD_LABELS: Record<DashboardLabelKey, string> = {
  ...DEFAULT_DASHBOARD_LABELS,
  ...(JSON.parse(localStorage.getItem("dashboard_labels") || "{}") || {}),
};

export function saveDashboardLabels(
  newLabels: Record<DashboardLabelKey, string>
) {
  localStorage.setItem("dashboard_labels", JSON.stringify(newLabels));
  Object.assign(DASHBOARD_LABELS, newLabels);
}

/* ---------------------------------------------------
   2. PARK NAME SYSTEM
--------------------------------------------------- */

function slugifyPark(url: string): string {
  return url
    .replace(/^opc\.tcp:\/\//i, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .toLowerCase();
}

export const DASHBOARD_PARK_NAMES: Record<string, string> = {
  ...(JSON.parse(localStorage.getItem("park_display_names") || "{}") || {}),
};

export function saveParkNames(map: Record<string, string>) {
  localStorage.setItem("park_display_names", JSON.stringify(map));
  Object.assign(DASHBOARD_PARK_NAMES, map);
}

/* ---------------------------------------------------
   3. HELPERS
--------------------------------------------------- */

function getNode(nodes: any[], key: string) {
  return nodes.find((x) => x.name === key)?.value ?? null;
}

function toNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function avg(list: (number | null)[]) {
  const vals = list.filter((x): x is number => x !== null);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function isTrue(v: unknown) {
  const s = String(v).toLowerCase();
  return s === "true" || s === "1";
}

function isFalse(v: unknown) {
  const s = String(v).toLowerCase();
  return s === "false" || s === "0";
}

/**
 * General parser for two-bit boolean pairs.
 * Handles both:
 *   [True, False]
 *   "[True, False]"
 */
function parseBoolPair(raw: any): [string, string] | null {
  if (Array.isArray(raw) && raw.length >= 2) {
    return [
      String(raw[0]).trim().toLowerCase(),
      String(raw[1]).trim().toLowerCase(),
    ];
  }

  if (typeof raw === "string" && raw.trim().startsWith("[")) {
    try {
      const cleaned = raw.replace(/[\[\]]/g, "");
      const parts = cleaned.split(",");
      if (parts.length >= 2) {
        return [
          parts[0].trim().toLowerCase(),
          parts[1].trim().toLowerCase(),
        ];
      }
    } catch {
      return null;
    }
  }

  return null;
}

/* ---------------------------------------------------
   4. TYPES
--------------------------------------------------- */

export interface ParkDashboardMetrics {
  activePowerKw: number | null;
  reactivePowerKvar: number | null;
  avgCurrentA: number | null;
  avgVoltageKv: number | null;
  frequencyHz: number | null;
  powerFactor: number | null;
  maxProductionCapacity: number | null;

  cbStatus: "OPEN" | "CLOSED" | "UNKNOWN";

  cmdSetpointKw: number | null;
  cmdSetpointPercent: number | null;
  cmdInstantCutoff: boolean | null;
}

export interface ParkDashboardView {
  id: string;
  name: string;
  url: string;
  status: "CONNECTED" | "CONNECTING" | "DISCONNECTED" | "ERROR";
  metrics: ParkDashboardMetrics;
}

/* ---------------------------------------------------
   5. MAIN TRANSFORMER
--------------------------------------------------- */

export function plcClientToDashboardView(
  client: PLCClient
): ParkDashboardView {
  const nodes = Array.isArray(client.nodes) ? client.nodes : [];
  const id = slugifyPark(client.url);

  // Auto-register missing park names
  if (!DASHBOARD_PARK_NAMES[id]) {
    DASHBOARD_PARK_NAMES[id] = client.name;
    saveParkNames(DASHBOARD_PARK_NAMES);
  }

  const displayName = DASHBOARD_PARK_NAMES[id];

  const activePowerKw = toNum(getNode(nodes, "Active_Power_Measurement"));
  const reactivePowerKvar = toNum(getNode(nodes, "Reactive_Power_Measurement"));

  const cur = avg([
    toNum(getNode(nodes, "Ouput_Current_Phase_1_Measurement")),
    toNum(getNode(nodes, "Ouput_Current_Phase_2_Measurement")),
    toNum(getNode(nodes, "Ouput_Current_Phase_3_Measurement")),
  ]);
  const avgCurrentA = cur !== null ? Number((cur / 10).toFixed(1)) : null;

  const vol = avg([
    toNum(getNode(nodes, "Ouput_Voltage_Phase_1_Measurement")),
    toNum(getNode(nodes, "Ouput_Voltage_Phase_2_Measurement")),
    toNum(getNode(nodes, "Ouput_Voltage_Phase_3_Measurement")),
  ]);
  const avgVoltageKv = vol !== null ? Number((vol / 100).toFixed(1)) : null;

  const fRaw = toNum(getNode(nodes, "Output_Frequency_Measurement"));
  const frequencyHz = fRaw !== null ? Number((fRaw / 100).toFixed(2)) : null;

  const pfRaw = toNum(getNode(nodes, "Power_Factor_Cosφ_Measurement"));
  const powerFactor =
    pfRaw !== null ? Number((pfRaw / 32767).toFixed(3)) : null;

  const maxProductionCapacity = toNum(
    getNode(nodes, "Maximum_Production_Capacity")
  );

  /* ---------------- CB Status ---------------- */

  const cbRaw = getNode(nodes, "CB_Status(Open/Closed)");
  let cbStatus: "OPEN" | "CLOSED" | "UNKNOWN" = "UNKNOWN";

  const cbPair = parseBoolPair(cbRaw);

  if (cbPair) {
    const [a, b] = cbPair;

    // [False, True]  → CLOSED
    if (isFalse(a) && isTrue(b)) cbStatus = "CLOSED";

    // [True, False]  → OPEN
    else if (isTrue(a) && isFalse(b)) cbStatus = "OPEN";
  }

  /* ---------------- Instant Cutoff ---------------- */

    const cutoffRaw = getNode(nodes, "CMD_Instant_Cutoff");
  let cmdInstantCutoff: boolean | null = null;

  const cutoffPair = parseBoolPair(cutoffRaw);
  if (cutoffPair) {
    const [a, b] = cutoffPair;

    // Confirmed mapping:
    //   [True,  False] -> park ON  (cutoff OFF)
    //   [False, True]  -> park OFF (cutoff ON)

    if (isTrue(a) && isFalse(b)) {
      // cutoff OFF -> switch should be OFF
      cmdInstantCutoff = false;
    } else if (isFalse(a) && isTrue(b)) {
      // cutoff ON -> switch should be ON
      cmdInstantCutoff = true;
    }
  }

  /* ---------------- Setpoints ---------------- */

  const cmdSetpointKw = toNum(
    getNode(nodes, "CMD_Active_Power_Setpoint_kW")
  );
  const cmdSetpointPercent = toNum(
    getNode(nodes, "CMD_Active_Power_Setpoint_%")
  );

  return {
    id,
    name: displayName,
    url: client.url,
    status: client.status,
    metrics: {
      activePowerKw,
      reactivePowerKvar,
      avgCurrentA,
      avgVoltageKv,
      frequencyHz,
      powerFactor,
      maxProductionCapacity,
      cbStatus,
      cmdSetpointKw,
      cmdSetpointPercent,
      cmdInstantCutoff,
    },
  };
}
