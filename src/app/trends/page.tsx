// src/app/trends/page.tsx
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PREDEFINED_METRICS, findMetricDefinition } from '@/config/metrics';
import type { MetricEntry, MetricDefinition, CustomMetric } from '@/types';
import useLocalStorage from '@/hooks/use-local-storage';
import { trendExplanation, TrendExplanationInput } from '@/ai/flows/trend-explanation';
import { Loader2, Lightbulb, AlertTriangle, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subDays, parseISO, isValid } from 'date-fns';

// Placeholder for DateRangePicker until created (using simplified inputs for now)
const TrendDateRangeSelector = ({ onRangeSelect }: { onRangeSelect: (days: number) => void }) => {
  const ranges = [
    { label: 'Last 7 Days', value: 7 },
    { label: 'Last 30 Days', value: 30 },
    { label: 'Last 90 Days', value: 90 },
  ];
  const [selectedRange, setSelectedRange] = useState<string>("30");

  useEffect(() => {
    onRangeSelect(parseInt(selectedRange));
  }, [selectedRange, onRangeSelect]);

  return (
    <Select value={selectedRange} onValueChange={setSelectedRange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select Period" />
      </SelectTrigger>
      <SelectContent>
        {ranges.map(range => (
          <SelectItem key={range.value} value={String(range.value)}>
            {range.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};


export default function TrendsPage() {
  const [metricEntries] = useLocalStorage<MetricEntry[]>('metricEntries', []);
  const [customMetrics] = useLocalStorage<CustomMetric[]>('customMetrics', []);
  
  const [selectedMetricId, setSelectedMetricId] = useState<string>('');
  const [selectedPeriodDays, setSelectedPeriodDays] = useState<number>(30);
  
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const allMetricDefinitions = useMemo(() => [...PREDEFINED_METRICS, ...customMetrics], [customMetrics]);

   useEffect(() => {
    if (!selectedMetricId && allMetricDefinitions.length > 0) {
      setSelectedMetricId(allMetricDefinitions[0].id);
    }
  }, [selectedMetricId, allMetricDefinitions]);


  const handleAnalyzeTrend = async () => {
    if (!selectedMetricId) {
      setError("Please select a metric to analyze.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setExplanation(null);

    try {
      const metricDef = findMetricDefinition(selectedMetricId, customMetrics);
      if (!metricDef) {
        throw new Error("Metric definition not found.");
      }

      const fromDate = subDays(new Date(), selectedPeriodDays);
      const relevantEntries = metricEntries
        .filter(entry => {
            const entryDate = parseISO(entry.date);
            return entry.metricId === selectedMetricId && isValid(entryDate) && entryDate >= fromDate;
        })
        .map(entry => ({ date: entry.date, value: entry.value })); // Keep it simple for AI

      if (relevantEntries.length < 3) { // Need some data points for a trend
        setError(`Not enough data for ${metricDef.name} in the last ${selectedPeriodDays} days to analyze a trend. At least 3 data points are recommended.`);
        setIsLoading(false);
        return;
      }
      
      const input: TrendExplanationInput = {
        metricsData: JSON.stringify(relevantEntries),
        trendDescription: `Analyze the trend for ${metricDef.name} (${metricDef.unit}) over the last ${selectedPeriodDays} days. Data points: ${relevantEntries.length}. Today is ${format(new Date(), 'yyyy-MM-dd')}.`,
      };

      const result = await trendExplanation(input);
      setExplanation(result.explanation);

    } catch (e: any) {
      console.error("Error analyzing trend:", e);
      setError(e.message || "Failed to analyze trend. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Trend Analyzer</CardTitle>
          <CardDescription>
            Discover patterns and correlations in your life metrics using AI-powered analysis.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1">
              <label htmlFor="metric-select" className="block text-sm font-medium text-foreground mb-1">Select Metric</label>
              <Select value={selectedMetricId} onValueChange={setSelectedMetricId}>
                <SelectTrigger id="metric-select" className="w-full sm:w-[240px]">
                  <SelectValue placeholder="Choose a metric" />
                </SelectTrigger>
                <SelectContent>
                  {allMetricDefinitions.map((metric) => (
                    <SelectItem key={metric.id} value={metric.id}>
                      {metric.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
               <label htmlFor="period-select" className="block text-sm font-medium text-foreground mb-1">Select Period</label>
              <TrendDateRangeSelector onRangeSelect={setSelectedPeriodDays} />
            </div>
            <Button onClick={handleAnalyzeTrend} disabled={isLoading || !selectedMetricId} className="w-full sm:w-auto">
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Analyze Trend
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Analyzing...
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Analysis Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {explanation && !isLoading && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Lightbulb className="h-5 w-5" />
              Trend Insight
            </CardTitle>
             <CardDescription>
              AI-generated explanation for {findMetricDefinition(selectedMetricId, customMetrics)?.name} over the last {selectedPeriodDays} days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none text-foreground">
              {explanation.split('\\n').map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
       {!isLoading && !explanation && !error && (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center">
             <Lightbulb className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Ready to find some insights?</p>
            <p className="text-muted-foreground">Select a metric and period, then click "Analyze Trend".</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
