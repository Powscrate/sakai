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
import { DateRangePicker } from '@/components/ui/date-range-picker';
import type { DateRange } from 'react-day-picker';
import { subDays, format, parseISO, isValid, compareAsc } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
import { TrendingUp, PlusCircle, BarChart3 as BarChartIcon } from 'lucide-react'; // Renamed BarChart3 to avoid conflict

export default function DashboardPage() {
  const [metricEntries] = useLocalStorage<MetricEntry[]>('metricEntries', []);
  const [customMetrics] = useLocalStorage<MetricDefinition[]>('customMetrics', []);
  const [selectedMetricId, setSelectedMetricId] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const allMetricDefinitions = useMemo(() => [...PREDEFINED_METRICS, ...customMetrics], [customMetrics]);

  useEffect(() => {
    if (!selectedMetricId && allMetricDefinitions.length > 0) {
      setSelectedMetricId(allMetricDefinitions[0].id);
    }
  }, [selectedMetricId, allMetricDefinitions]);
  
  const filteredData = useMemo(() => {
    if (!selectedMetricId) return [];
    return metricEntries
      .filter(entry => {
        const entryDate = parseISO(entry.date);
        const fromDate = dateRange?.from ? startOfDay(dateRange.from) : undefined;
        const toDate = dateRange?.to ? startOfDay(dateRange.to) : undefined;
        let isInDateRange = true;
        if (fromDate && entryDate < fromDate) isInDateRange = false;
        if (toDate && entryDate > toDate) isInDateRange = false;
        return entry.metricId === selectedMetricId && isValid(entryDate) && isInDateRange;
      })
      .sort((a, b) => compareAsc(parseISO(a.date), parseISO(b.date)))
      .map(entry => ({
        date: format(parseISO(entry.date), 'MMM dd', { locale: fr }),
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

  const startOfDay = (date: Date) => {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
  };

  if (allMetricDefinitions.length === 0 && metricEntries.length === 0) {
     return (
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <TrendingUp className="h-16 w-16 text-muted-foreground" />
          <h3 className="text-2xl font-bold tracking-tight">
            Bienvenue sur Perspectives de Vie !
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Commencez par enregistrer votre première métrique pour voir vos progrès et obtenir des informations.
            Vous pouvez suivre des choses comme l'exercice, le sommeil, l'humeur, et plus encore.
          </p>
          <Link href="/log-data" passHref>
            <Button className="mt-4">
              <PlusCircle className="mr-2 h-4 w-4" /> Enregistrer votre Première Métrique
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Aperçu des Métriques</CardTitle>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 md:gap-4 w-full sm:w-auto">
            <Select value={selectedMetricId} onValueChange={setSelectedMetricId}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Sélectionner une métrique" />
              </SelectTrigger>
              <SelectContent>
                {allMetricDefinitions.map(metric => (
                  <SelectItem key={metric.id} value={metric.id}>
                    {metric.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DateRangePicker date={dateRange} onDateChange={setDateRange} />
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
                        if (payload && payload.length > 0 && payload[0].payload.fullDate) {
                          return format(parseISO(payload[0].payload.fullDate), "EEE, MMM d, yyyy", { locale: fr });
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
            <div className="flex flex-col items-center justify-center h-[400px] text-center p-4">
              <BarChartIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold">Aucune donnée disponible</p>
              <p className="text-muted-foreground">
                {metricEntries.length === 0 ? "Enregistrez des données pour voir les graphiques." : `Aucune donnée pour ${selectedMetricDef?.name || 'la métrique sélectionnée'} dans cette période.`}
              </p>
              {metricEntries.length === 0 && (
                 <Link href="/log-data" passHref>
                    <Button variant="outline" className="mt-4">Enregistrer des Données</Button>
                 </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Activité Récente</CardTitle>
            <CardDescription>Résumé de vos dernières entrées.</CardDescription>
          </CardHeader>
          <CardContent>
            {metricEntries.slice(0, 5).map(entry => {
              const def = findMetricDefinition(entry.metricId, customMetrics);
              return (
                <div key={entry.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                  <div>
                    <span className="font-medium">{def?.name || entry.metricId}</span>: <span className="text-primary">{entry.value} {def?.unit}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{format(parseISO(entry.date), 'MMM dd', { locale: fr })}</span>
                </div>
              );
            })}
            {metricEntries.length === 0 && <p className="text-muted-foreground">Aucune activité récente.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Objectifs Actifs</CardTitle>
             <CardDescription>Vos objectifs personnels actuels.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Suivi des objectifs disponible.</p>
             <Link href="/goals" passHref>
                <Button variant="outline" className="mt-2 w-full">Voir les Objectifs</Button>
             </Link>
          </CardContent>
        </Card>
         <Card>
          <CardHeader>
            <CardTitle>Tendances IA</CardTitle>
             <CardDescription>Découvrez des modèles dans vos données.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Analyse des tendances par IA disponible.</p>
             <Link href="/trends" passHref>
                <Button variant="outline" className="mt-2 w-full">Analyser les Tendances</Button>
             </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
