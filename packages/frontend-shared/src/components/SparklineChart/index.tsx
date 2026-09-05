"use client";

import React from "react";
import { SparkLineChart } from "@mui/x-charts/SparkLineChart";

interface SparklineChartProps {
  data: number[];
  type?: "line" | "bar";
  color?: string;
  width?: number;
  height?: number;
  className?: string;
  sx?: any;
}

const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  type = "line",
  color = "#1A2B88",
  width = 80,
  height = 30,
  className,
  sx,
}) => {
  return (
    <div className={className} style={{ width, height }}>
      <SparkLineChart
        data={data}
        plotType={type}
        height={height}
        width={width}
        // @ts-ignore
        colors={[color]}
        sx={{
          "& .MuiSparkLineChart-root": {
            overflow: "visible",
          },
          "& .MuiLineElement-root": {
            stroke: color,
            strokeWidth: 2,
          },
          "& .MuiBarElement-root": {
            fill: color,
            rx: 2, // Rounded corners for bars
          },
          ...sx,
        }}
        {...(type === "line" ? { curve: "monotoneX" } : {})}
      />
    </div>
  );
};

export default SparklineChart;
