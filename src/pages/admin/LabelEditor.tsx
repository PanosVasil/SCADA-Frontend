// src/pages/admin/LabelEditor.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DASHBOARD_LABEL_KEYS,
  DASHBOARD_LABELS,
  saveDashboardLabels,
  DASHBOARD_PARK_NAMES,
  saveParkNames,
} from "@/lib/telemetryTransform";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function LabelEditor() {
  const { isSuperuser } = useAuth();

  const [labels, setLabels] = useState({ ...DASHBOARD_LABELS });
  const [parkNames, setParkNames] = useState({ ...DASHBOARD_PARK_NAMES });

  if (!isSuperuser) {
    return (
      <div className="p-6 text-red-500 font-medium">
        Only administrators can edit dashboard labels.
      </div>
    );
  }

  function updateLabel(key: string, value: string) {
    setLabels((prev) => ({ ...prev, [key]: value }));
  }

  function updatePark(id: string, value: string) {
    setParkNames((prev) => ({ ...prev, [id]: value }));
  }

  function handleSave() {
    saveDashboardLabels(labels);
    saveParkNames(parkNames);
    toast.success("Changes saved!");
  }

  const parkKeys = Object.keys(parkNames);

  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-bold">Dashboard Label Editor</h1>

      {/* Metric Labels */}
      <Card>
        <CardHeader>
          <CardTitle>Edit Metric Display Names</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {DASHBOARD_LABEL_KEYS.map((key) => (
            <div key={key} className="flex flex-col space-y-1">
              <label className="text-xs text-muted-foreground">{key}</label>
              <Input
                value={labels[key]}
                onChange={(e) => updateLabel(key, e.target.value)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Park Display Names */}
      <Card>
        <CardHeader>
          <CardTitle>Edit Park Display Names</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {parkKeys.map((id) => (
            <div key={id} className="flex flex-col space-y-1">
              <label className="text-xs text-muted-foreground">{id}</label>
              <Input
                value={parkNames[id]}
                onChange={(e) => updatePark(id, e.target.value)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={handleSave}>Save Changes</Button>
    </div>
  );
}
