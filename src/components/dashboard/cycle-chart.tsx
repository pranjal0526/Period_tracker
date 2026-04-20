"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildChartData, type CycleRecord } from "@/lib/utils/cycle-calculations";

type CycleChartProps = {
  cycles: CycleRecord[];
};

export function CycleChart({ cycles }: CycleChartProps) {
  const data = buildChartData(cycles);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Cycle rhythm</CardTitle>
        <CardDescription>
          Track cycle length against bleeding duration over the last six entries.
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[220px] sm:h-[260px]">
        {data.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(83,53,42,0.12)" vertical={false} />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#6b5550", fontSize: 11 }}
              />
              <YAxis
                width={30}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#6b5550", fontSize: 11 }}
              />
              <Tooltip
                cursor={{ fill: "rgba(227,112,77,0.06)" }}
                contentStyle={{
                  borderRadius: 18,
                  border: "1px solid rgba(83,53,42,0.12)",
                  background: "rgba(255,253,249,0.96)",
                }}
              />
              <Bar dataKey="cycleLength" radius={[10, 10, 0, 0]} fill="var(--primary)" />
              <Bar dataKey="periodLength" radius={[10, 10, 0, 0]} fill="var(--secondary)" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-line bg-card text-sm text-muted">
            Your first few logged cycles will turn this into a trend view.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
