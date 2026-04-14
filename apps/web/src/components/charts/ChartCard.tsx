import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card } from "../data-display/Surface";
import { EmptyState } from "../feedback/Feedback";

const chartColors = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-chart-6)",
];

const tooltipStyle = {
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "12px",
  color: "var(--color-text)",
};

export const LineChartCard = ({
  title,
  data,
}: {
  title: string;
  data: Array<{ label: string; value: number }>;
}): JSX.Element => (
  <Card>
    <div className="pageStack">
      <strong>{title}</strong>
      {data.length === 0 ? (
        <EmptyState
          description="Run a cost sync to see historical trend lines."
          title="No timeseries data yet"
        />
      ) : (
        <div style={{ height: 280 }}>
          <ResponsiveContainer>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="label" stroke="var(--color-text-subtle)" />
              <YAxis stroke="var(--color-text-subtle)" />
              <Tooltip contentStyle={tooltipStyle} />
              <Area
                dataKey="value"
                fill="url(#chartFill)"
                stroke="var(--color-chart-1)"
                strokeWidth={2}
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  </Card>
);

export const BarChartCard = ({
  title,
  data,
}: {
  title: string;
  data: Array<{ label: string; value: number }>;
}): JSX.Element => (
  <Card>
    <div className="pageStack">
      <strong>{title}</strong>
      {data.length === 0 ? (
        <EmptyState
          description="Service-level cost data will appear after a sync."
          title="No service data yet"
        />
      ) : (
        <div style={{ height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={data}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="label" stroke="var(--color-text-subtle)" />
              <YAxis stroke="var(--color-text-subtle)" />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" fill="var(--color-chart-2)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  </Card>
);

export const DonutChartCard = ({
  title,
  data,
}: {
  title: string;
  data: Array<{ label: string; value: number }>;
}): JSX.Element => (
  <Card>
    <div className="pageStack">
      <strong>{title}</strong>
      {data.length === 0 ? (
        <EmptyState
          description="Connect an AWS account and sync data to unlock cost distribution."
          title="No allocation data yet"
        />
      ) : (
        <div style={{ height: 280 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                cx="50%"
                cy="50%"
                data={data}
                dataKey="value"
                innerRadius={72}
                nameKey="label"
                outerRadius={110}
              >
                {data.map((entry, index) => (
                  <Cell fill={chartColors[index % chartColors.length]} key={entry.label} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  </Card>
);
