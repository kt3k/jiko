import { useEffect, useRef } from "preact/hooks";
import { Chart as ChartJS } from "chart.js/auto";
import type { ChartConfig } from "./Chat.tsx";

interface ChartProps {
  config: ChartConfig;
}

export default function Chart({ config }: ChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<ChartJS | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    chartRef.current = new ChartJS(canvasRef.current, {
      type: config.chart_type,
      data: {
        labels: config.labels,
        datasets: config.datasets,
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: config.title,
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [config]);

  return (
    <div class="mt-3 bg-white rounded-lg p-2">
      <canvas ref={canvasRef} />
    </div>
  );
}
