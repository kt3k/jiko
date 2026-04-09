import { useEffect, useRef } from "preact/hooks";
import type { ChartConfig } from "./Chat.tsx";

// deno-lint-ignore no-explicit-any
type ChartJs = any;
let chartJsPromise: Promise<ChartJs> | null = null;

function loadChartJs(): Promise<ChartJs> {
  if (!chartJsPromise) {
    chartJsPromise = import("https://esm.sh/chart.js@4.4.7/auto");
  }
  return chartJsPromise;
}

interface ChartProps {
  config: ChartConfig;
}

export default function Chart({ config }: ChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // deno-lint-ignore no-explicit-any
  const chartRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    loadChartJs().then((mod) => {
      if (cancelled || !canvasRef.current) return;

      const ChartConstructor = mod.default ?? mod.Chart;

      if (chartRef.current) {
        chartRef.current.destroy();
      }

      chartRef.current = new ChartConstructor(canvasRef.current, {
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
    });

    return () => {
      cancelled = true;
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
