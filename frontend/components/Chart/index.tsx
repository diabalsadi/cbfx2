'use client'

import dynamic from 'next/dynamic';
import style from './Chart.module.scss';

const ChartSkeleton = () => <div className={style.skeleton} />;

const LineChart = dynamic(
    () => import('@mui/x-charts/LineChart').then(mod => mod.LineChart),
    {
        ssr: false,
        loading: () => <ChartSkeleton />
    }
);

interface ChartProps {
    seriesData: number[];
    xAxisData: string[];
    hideAxisLines?: boolean;
    className?: string;
    color?: string;
    gradient?: {
        start: string;
        end: string;
    };
}


const Chart = ({
    seriesData,
    xAxisData,
    hideAxisLines = false,
    className,
    color = '#D9641E',
    gradient = { start: '#D9641E', end: '#D9641E' }
}: ChartProps) => {
    const gradientId = `areaGradient-${color.replace('#', '')}`;

    return (
        <div className={className}>
            <LineChart
                xAxis={[
                    {
                        scaleType: 'point',
                        data: xAxisData,
                        disableLine: hideAxisLines,
                        disableTicks: hideAxisLines,
                    },
                ]}
                yAxis={[
                    {
                        disableLine: hideAxisLines,
                        disableTicks: hideAxisLines,
                    },
                ]}
                series={[
                    {
                        // @ts-ignore
                        data: seriesData,
                        area: true,
                        curve: 'monotoneX',
                        color: color,
                    },
                ]}
                height={280}
                grid={{ horizontal: false, vertical: false }}
                sx={{
                    width: '100%',

                    '& .MuiLineElement-root': {
                        strokeWidth: 3,
                    },

                    '& .MuiAreaElement-root': {
                        fill: `url(#${gradientId})`,
                        fillOpacity: 1,
                    },

                    '& .MuiMarkElement-root': {
                        display: 'none',
                    },

                    '& .MuiChartsAxis-tickLabel': {
                        fill: '#888',
                        fontSize: 12,
                    },

                    // 🔥 HARD REMOVE any remaining axis stroke
                    ...(hideAxisLines && {
                        '& .MuiChartsAxis-line': {
                            display: 'none',
                        },
                        '& .MuiChartsAxis-tick': {
                            display: 'none',
                        },
                    }),
                }}
            >
                <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={gradient.start} stopOpacity="0.5" />
                        <stop offset="100%" stopColor={gradient.end} stopOpacity="0.05" />
                    </linearGradient>
                </defs>
            </LineChart>
        </div>
    );
};


export default Chart;
