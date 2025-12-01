import { useEffect, useState } from "react";
import { apiService } from "@/services/api";
import { websocketService } from "@/services/websocket";
import type { TelemetryData, PLCNode } from "@/types/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { toast } from "sonner";

export default function LiveTelemetry() {
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [loading, setLoading] = useState(true);

  // Which parks are expanded
  const [expandedClients, setExpandedClients] = useState<Set<string>>(
    new Set()
  );

  // Nodes that changed recently (for row highlight)
  const [changedNodes, setChangedNodes] = useState<Set<string>>(new Set());

  // Global park search (filters which cards are visible)
  const [parkFilter, setParkFilter] = useState("");

  // Per-park node filter text (keyed by client URL)
  const [nodeFilters, setNodeFilters] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadData() {
      try {
        const data = await apiService.getTelemetryData();
        setTelemetry(data);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load telemetry data");
      } finally {
        setLoading(false);
      }
    }

    loadData();

    const unsubscribe = websocketService.onMessage((raw: any) => {
      // Support both shapes:
      //  1) { plc_clients: [...] }
      //  2) { type: "telemetry_update", data: { plc_clients: [...] } }
      const next: TelemetryData | null =
        raw?.plc_clients
          ? (raw as TelemetryData)
          : raw?.type === "telemetry_update" && raw?.data?.plc_clients
          ? (raw.data as TelemetryData)
          : null;

      if (!next) return;

      // Detect value changes for highlight animation
      if (telemetry) {
        const changed = new Set<string>();
        next.plc_clients.forEach((newClient) => {
          const oldClient = telemetry.plc_clients.find(
            (c) => c.url === newClient.url
          );
          if (!oldClient) return;

          newClient.nodes.forEach((newNode) => {
            const oldNode = oldClient.nodes.find(
              (n) => n.name === newNode.name
            );
            if (oldNode && oldNode.value !== newNode.value) {
              changed.add(`${newClient.url}-${newNode.name}`);
            }
          });
        });
        setChangedNodes(changed);
        setTimeout(() => setChangedNodes(new Set()), 1000);
      }

      setTelemetry(next);
    });

    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telemetry]);

  const toggleExpanded = (url: string) => {
    setExpandedClients((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const handleNodeFilterChange = (url: string, value: string) => {
    setNodeFilters((prev) => ({
      ...prev,
      [url]: value,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading telemetry data...</p>
        </div>
      </div>
    );
  }

  const parkFilterLower = parkFilter.trim().toLowerCase();

  const visibleClients =
    telemetry?.plc_clients.filter((client) => {
      if (!parkFilterLower) return true;
      return (
        client.name.toLowerCase().includes(parkFilterLower) ||
        client.url.toLowerCase().includes(parkFilterLower)
      );
    }) ?? [];

  return (
    <div className="space-y-6">
      {/* Header + park search */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Live Telemetry</h1>
          <p className="text-muted-foreground">
            Real-time PLC data monitoring for all parks
          </p>
        </div>

        {/* Park filter */}
        <div className="w-full md:w-72">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Filter parks
          </label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8 text-sm"
              placeholder="Search by park name or URL..."
              value={parkFilter}
              onChange={(e) => setParkFilter(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {visibleClients.map((client) => {
          const isExpanded = expandedClients.has(client.url);
          const nodeFilterText = nodeFilters[client.url] ?? "";

          return (
            <Card key={client.url} className="shadow-md">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div className="flex flex-col justify-center">
                  <CardTitle className="text-xl font-semibold">
                    {client.name}
                  </CardTitle>
                </div>

                <div className="flex items-center gap-3">
                  <StatusBadge status={client.status} />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleExpanded(client.url)}
                    className="flex items-center gap-1"
                  >
                    {isExpanded ? "Hide nodes" : "Show nodes"}
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>


              {isExpanded && (
                <CardContent className="pt-0 pb-4 space-y-3">
                  {/* Node filter for this park */}
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <p className="text-xs text-muted-foreground">
                      Showing raw OPC UA nodes for this park.
                    </p>
                    <div className="w-full md:w-64">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Filter nodes
                      </label>
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          className="pl-8 text-xs md:text-sm"
                          placeholder="Search node name..."
                          value={nodeFilterText}
                          onChange={(e) =>
                            handleNodeFilterChange(client.url, e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <NodeTable
                    nodes={client.nodes}
                    clientUrl={client.url}
                    changedNodes={changedNodes}
                    filterText={nodeFilterText}
                  />
                </CardContent>
              )}
            </Card>
          );
        })}

        {!visibleClients.length && (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-muted-foreground">
                {parkFilter
                  ? "No parks match your filter."
                  : "No PLC clients configured."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function NodeTable({
  nodes,
  clientUrl,
  changedNodes,
  filterText,
}: {
  nodes: PLCNode[];
  clientUrl: string;
  changedNodes: Set<string>;
  filterText: string;
}) {
  if (!nodes.length) {
    return (
      <p className="text-sm text-muted-foreground px-1 py-2">
        No nodes available
      </p>
    );
  }

  const filterLower = filterText.trim().toLowerCase();
  const visibleNodes = filterLower
    ? nodes.filter((n) => n.name.toLowerCase().includes(filterLower))
    : nodes;

  if (!visibleNodes.length) {
    return (
      <p className="text-sm text-muted-foreground px-1 py-2">
        No nodes match this filter
      </p>
    );
  }

  return (
    <div className="border border-border/60 rounded-xl overflow-hidden">
      <div className="max-h-[420px] overflow-auto">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-1/2">Node Name</TableHead>
              <TableHead className="w-1/2">
                <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-1">
                  <span>PLC Value</span>
                  <span className="whitespace-nowrap">
                    Last Update
                  </span>
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleNodes.map((node) => {
              const key = `${clientUrl}-${node.name}`;
              const isChanged = changedNodes.has(key);

              return (
                <TableRow
                  key={node.name}
                  className={isChanged ? "animate-flash-green" : ""}
                >
                  <TableCell className="font-medium text-xs md:text-sm">
                    {node.name}
                  </TableCell>
                  <TableCell className="text-xs md:text-sm">
                    <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-1">
                      <span className="font-mono">
                        {String(node.value)}
                      </span>
                      <span className="text-[10px] md:text-xs text-muted-foreground md:ml-3 whitespace-nowrap">
                        Last updated: {node.timestamp || "N/A"}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
