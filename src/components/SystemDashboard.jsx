import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";

// Default export React component (shadcn + recharts)
export default function SystemDashboard({ apiUrl = "http://103.167.133.200:3000/api/system/all" }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [intervalMs, setIntervalMs] = useState(5000);
  const { toast } = useToast ? useToast() : { toast: () => {} };

  useEffect(() => {
    let timer;
    fetchData();
    if (autoRefresh) {
      timer = setInterval(fetchData, intervalMs);
    }
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, intervalMs]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message || "Failed to load");
      toast && toast({ title: "Error", description: String(err) });
    } finally {
      setLoading(false);
    }
  }

  // Helper transforms
  const cpuUsagePercent = data?.cpu?.usage?.total ? Number((data.cpu.usage.total * 100).toFixed(2)) : 0;
  const cpuPerCore = (data?.cpu?.usage?.perCore || []).map((v, i) => ({ name: `core ${i}`, value: v * 100 }));
  const loadAvg = data?.cpu?.loadAverage ? [{ name: "1m", value: data.cpu.loadAverage["1m"] }, { name: "5m", value: data.cpu.loadAverage["5m"] }, { name: "15m", value: data.cpu.loadAverage["15m"] }] : [];

  const memoryStats = data?.memory?.ram ? [
    { name: "used", value: data.memory.ram.usedMB },
    { name: "free", value: data.memory.ram.freeMB },
    { name: "cached", value: data.memory.ram.cachedMB || 0 },
  ] : [];

  const diskParts = data?.disk?.partitions || [];
  const diskPie = diskParts.map((p) => ({ name: p.mount, used: p.usedGB, free: p.freeGB }));

  const netIf = data?.network?.interfaces || [];
  const netIoSeries = netIf.map((i) => ({ name: i.name, rx: i.rxBytes, tx: i.txBytes }));

  const processesTop = data?.processes?.top || [];
  const connections = data?.network?.connections || [];

  // Tiny presentational helpers
  const number = (v) => (v === undefined || v === null ? "-" : v);

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">System Monitor</h1>
        <div className="flex items-center gap-2">
          <Input value={String(intervalMs)} onChange={(e) => setIntervalMs(Number(e.target.value || 5000))} className="w-28" />
          <Button onClick={() => { setAutoRefresh(!autoRefresh); }}>
            {autoRefresh ? "Stop Auto" : "Start Auto"}
          </Button>
          <Button variant={"ghost"} onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CPU Card */}
        <Card>
          <CardHeader>
            <CardTitle>CPU</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-3xl font-semibold">{cpuUsagePercent}%</div>
                  <div className="text-sm text-muted-foreground">Total usage</div>
                </div>
                <div className="text-right">
                  <div className="text-sm">Cores: {number(data?.cpu?.cores)}</div>
                  <div className="text-sm">Freq: {number(data?.cpu?.frequencyMHz)} MHz</div>
                </div>
              </div>
            </div>

            <div style={{ width: "100%", height: 180 }}>
              <ResponsiveContainer>
                <BarChart data={cpuPerCore}>
                  <XAxis dataKey="name" />
                  <YAxis unit="%" />
                  <Tooltip />
                  <Bar dataKey="value" name="CPU %" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <Separator className="my-4" />
            <div style={{ width: "100%", height: 140 }}>
              <ResponsiveContainer>
                <LineChart data={loadAvg}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="value" name="Load Avg" stroke="#8884d8" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Memory Card */}
        <Card>
          <CardHeader>
            <CardTitle>Memory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-2">
              <div className="flex justify-between">
                <div>
                  <div className="text-xl font-semibold">{number(data?.memory?.ram?.usagePercent)}%</div>
                  <div className="text-sm text-muted-foreground">RAM usage</div>
                </div>
                <div className="text-right">
                  <div className="text-sm">Total: {number(data?.memory?.ram?.totalMB)} MB</div>
                  <div className="text-sm">Used: {number(data?.memory?.ram?.usedMB)} MB</div>
                </div>
              </div>
            </div>

            <div style={{ width: "100%", height: 180 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={memoryStats} dataKey="value" nameKey="name" outerRadius={60} label />
                  {memoryStats.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} />
                  ))}
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Disk Card */}
        <Card>
          <CardHeader>
            <CardTitle>Disk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3">
              {diskParts.map((p) => (
                <div key={p.mount} className="mb-2">
                  <div className="flex justify-between">
                    <div className="font-medium">{p.mount} ({p.filesystem})</div>
                    <div className="text-sm">{p.usagePercent?.toFixed ? p.usagePercent.toFixed(2) : String(p.usagePercent)}%</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{p.usedGB} GB used / {p.totalGB} GB total</div>
                </div>
              ))}
            </div>

            <div style={{ width: "100%", height: 160 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={diskPie} dataKey="used" nameKey="name" outerRadius={60} label />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Network + Processes grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Network Interfaces</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-56">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>IPv4</TableHead>
                    <TableHead>RX Bytes</TableHead>
                    <TableHead>TX Bytes</TableHead>
                    <TableHead>Errors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {netIf.map((i) => (
                    <TableRow key={i.name}>
                      <TableCell>{i.name}</TableCell>
                      <TableCell>{i.ipv4}</TableCell>
                      <TableCell>{i.rxBytes}</TableCell>
                      <TableCell>{i.txBytes}</TableCell>
                      <TableCell>{i.errors}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <Separator className="my-4" />
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <AreaChart data={netIoSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="rx" name="RX Bytes" />
                  <Area type="monotone" dataKey="tx" name="TX Bytes" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Processes</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-80">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>CPU %</TableHead>
                    <TableHead>MEM %</TableHead>
                    <TableHead>Threads</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processesTop.map((p) => (
                    <TableRow key={p.pid}>
                      <TableCell>{p.pid}</TableCell>
                      <TableCell>{p.user}</TableCell>
                      <TableCell>{p.name}</TableCell>
                      <TableCell>{p.cpuPercent?.toFixed ? p.cpuPercent.toFixed(4) : p.cpuPercent}</TableCell>
                      <TableCell>{p.memPercent?.toFixed ? p.memPercent.toFixed(4) : p.memPercent}</TableCell>
                      <TableCell>{p.threads}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <Separator className="my-4" />
            <div>
              <Badge>Totals: {number(data?.processes?.total)}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connections and system info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Network Connections</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-80">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proto</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Remote</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>PID</TableHead>
                    <TableHead>Process</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {connections.map((c, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{c.protocol}</TableCell>
                      <TableCell>{c.localAddress}</TableCell>
                      <TableCell>{c.remoteAddress}</TableCell>
                      <TableCell>{c.state}</TableCell>
                      <TableCell>{c.pid}</TableCell>
                      <TableCell>{c.process}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between"><div>Hostname</div><div className="font-medium">{data?.info?.hostname}</div></div>
              <div className="flex justify-between"><div>Uptime (s)</div><div className="font-medium">{data?.info?.uptimeSeconds}</div></div>
              <div className="flex justify-between"><div>OS</div><div className="font-medium">{data?.info?.os?.name} {data?.info?.os?.version}</div></div>
              <div className="flex justify-between"><div>Kernel</div><div className="font-medium">{data?.info?.os?.kernel}</div></div>
              <div className="flex justify-between"><div>Arch</div><div className="font-medium">{data?.info?.os?.architecture}</div></div>

              <Separator className="my-2" />
              <div>
                <div className="text-sm font-semibold mb-1">Logged users</div>
                {data?.info?.users?.map((u, idx) => (
                  <div key={idx} className="text-sm">{u.username} — {u.tty} — {u.loginTime}</div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Misc raw JSON viewer for full API */}
      <Card>
        <CardHeader>
          <CardTitle>Raw API (preview)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-96 overflow-auto text-xs bg-muted p-4 rounded">{loading ? "Loading..." : JSON.stringify(data, null, 2)}</pre>
        </CardContent>
      </Card>

      {error && (
        <div className="text-red-600">Error: {error}</div>
      )}
    </div>
  );
}
