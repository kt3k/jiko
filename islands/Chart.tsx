import type { ChartConfig } from "./Chat.tsx";

interface ChartProps {
  config: ChartConfig;
}

export default function Chart({ config }: ChartProps) {
  return (
    <div class="chart-container">
      <p>{config.title}</p>
      <canvas />
    </div>
  );
}
