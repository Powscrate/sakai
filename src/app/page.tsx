// src/app/page.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { BarChart, LineChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend as RechartsLegend, Bar, Line, ResponsiveContainer } from 'recharts';
import useLocalStorage from '@/hooks/use-local-storage';
import type { MetricEntry, MetricDefinition } from '@/types';
import { PREDEFINED_METRICS, findMetricDefinition } from '@/config/metrics';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker'; // Assuming this component exists or will be created
import type { DateRange } from 'react-day-picker';
import { subDays, format, parseISO, isValid, compareAsc } from 'date-fns';
import Link from 'next/link';
import { TrendingUp, PlusCircle } from 'lucide-react';

// Placeholder for DateRangePicker until created
const DateRangePickerPlaceholder = ({ date, onDateChange }: { date?: { from?: Date, to?: Date }, onDateChange: (range: DateRange | undefined) => void }) => {
  const [fromDate, setFromDate] = useState<string>(date?.from ? format(date.from, 'yyyy-MM-dd') : '');
  const [toDate, setToDate] = useState<string>(date?.to ? format(date.to, 'yyyy-MM-dd') : '');

  useEffect(() => {
    setFromDate(date?.from ? format(date.from, 'yyyy-MM-dd') : '');
    setToDate(date?.to ? format(date.to, 'yyyy-MM-dd') : '');
  }, [date]);

  const handleApply = () => {
    const from = parseISO(fromDate);
    const to = parseISO(toDate);
    if (isValid(from) && isValid(to)) {
      onDateChange({ from, to });
    } else if (isValid(from)) {
      onDateChange({ from });
    } else {
      onDateChange(undefined);
    }
  };
  
  return (
    <div className="flex gap-2 items-center">
      <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="p-2 border rounded-md" />
      <span className="text-muted-foreground">to</span>
      <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="p-2 border rounded-md" />
      <Button onClick={handleApply} size="sm">Apply</Button>
    </div>
  );
};


export default function DashboardPage() {
  const [metricEntries] = useLocalStorage<MetricEntry[]>('metricEntries', []);
  const [customMetrics] = useLocalStorage<MetricDefinition[]>('customMetrics', []);
  const [selectedMetricId, setSelectedMetricId] = useState<string>(PREDEFINED_METRICS[0]?.id || '');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const allMetricDefinitions = useMemo(() => [...PREDEFINED_METRICS, ...customMetrics], [customMetrics]);

  useEffect(() => {
    if (!selectedMetricId && PREDEFINED_METRICS.length > 0) {
      setSelectedMetricId(PREDEFINED_METRICS[0].id);
    }
  }, [selectedMetricId]);
  
  const filteredData = useMemo(() => {
    if (!selectedMetricId) return [];
    return metricEntries
      .filter(entry => {
        const entryDate = parseISO(entry.date);
        const fromDate = dateRange?.from;
        const toDate = dateRange?.to;
        let isInDateRange = true;
        if (fromDate && entryDate < fromDate) isInDateRange = false;
        if (toDate && entryDate > toDate) isInDateRange = false;
        return entry.metricId === selectedMetricId && isValid(entryDate) && isInDateRange;
      })
      .sort((a, b) => compareAsc(parseISO(a.date), parseISO(b.date)))
      .map(entry => ({
        date: format(parseISO(entry.date), 'MMM dd'),
        value: entry.value,
        fullDate: entry.date,
      }));
  }, [metricEntries, selectedMetricId, dateRange]);

  const selectedMetricDef = findMetricDefinition(selectedMetricId, customMetrics);

  const chartConfig = useMemo(() => {
    if (!selectedMetricDef) return {};
    return {
      [selectedMetricDef.id]: {
        label: selectedMetricDef.name,
        color: selectedMetricDef.color || 'hsl(var(--chart-1))',
      },
    };
  }, [selectedMetricDef]);


  if (allMetricDefinitions.length === 0 && metricEntries.length === 0) {
     return (
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <TrendingUp className="h-16 w-16 text-muted-foreground" />
          <h3 className="text-2xl font-bold tracking-tight">
            Welcome to Life Insights!
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Start by logging your first metric to see your progress and gain insights.
            You can track things like exercise, sleep, mood, and more.
          </p>
          <Link href="/log-data" passHref>
            <Button className="mt-4">
              <PlusCircle className="mr-2 h-4 w-4" /> Log Your First Metric
            </Button>
          </Link>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Metrics Overview</CardTitle>
          <div className="flex items-center gap-4">
            <Select value={selectedMetricId} onValueChange={setSelectedMetricId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Metric" />
              </SelectTrigger>
              <SelectContent>
                {allMetricDefinitions.map(metric => (
                  <SelectItem key={metric.id} value={metric.id}>
                    {metric.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DateRangePickerPlaceholder date={dateRange} onDateChange={setDateRange} />
          </div>
        </CardHeader>
        <CardContent>
          {selectedMetricDef && filteredData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[400px] w-full">
              <LineChart data={filteredData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis 
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  label={{ value: selectedMetricDef.unit, angle: -90, position: 'insideLeft', offset: 10 }}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      indicator="line"
                      labelFormatter={(value, payload) => {
                        if (payload && payload.length > 0) {
                           // Assuming payload[0].payload.fullDate is 'YYYY-MM-DD'
                          return format(parseISO(payload[0].payload.fullDate), "EEE, MMM d, yyyy");
                        }
                        return value;
                      }}
                    />
                  }
                />
                 <ChartLegend content={<ChartLegendContent />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={`var(--color-${selectedMetricDef.id})`}
                  strokeWidth={2}
                  dot={{
                    fill: `var(--color-${selectedMetricDef.id})`,
                    r: 4,
                  }}
                  activeDot={{
                    r: 6,
                    fill: `var(--color-${selectedMetricDef.id})`,
                    stroke: 'hsl(var(--background))',
                    strokeWidth: 2,
                  }}
                />
              </LineChart>
            </ChartContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[400px] text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold">No data available</p>
              <p className="text-muted-foreground">
                {metricEntries.length === 0 ? "Log some data to see charts." : `No data for ${selectedMetricDef?.name || 'selected metric'} in this period.`}
              </p>
              {metricEntries.length === 0 && (
                 <Link href="/log-data" passHref>
                    <Button variant="outline" className="mt-4">Log Data</Button>
                 </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Placeholder for more charts or summary cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Summary of your latest entries.</CardDescription>
          </CardHeader>
          <CardContent>
            {metricEntries.slice(0, 5).map(entry => {
              const def = findMetricDefinition(entry.metricId, customMetrics);
              return (
                <div key={entry.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                  <div>
                    <span className="font-medium">{def?.name || entry.metricId}</span>: <span className="text-primary">{entry.value} {def?.unit}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{format(parseISO(entry.date), 'MMM dd')}</span>
                </div>
              );
            })}
            {metricEntries.length === 0 && <p className="text-muted-foreground">No recent activity.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active Goals</CardTitle>
             <CardDescription>Your current personal goals.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Goal tracking coming soon.</p>
             <Link href="/goals" passHref>
                <Button variant="outline" className="mt-2 w-full">View Goals</Button>
             </Link>
          </CardContent>
        </Card>
         <Card>
          <CardHeader>
            <CardTitle>AI Trends</CardTitle>
             <CardDescription>Discover patterns in your data.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">AI-powered trend analysis coming soon.</p>
             <Link href="/trends" passHref>
                <Button variant="outline" className="mt-2 w-full">Analyze Trends</Button>
             </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
