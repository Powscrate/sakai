// src/app/trends/page.tsx
"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PREDEFINED_METRICS, findMetricDefinition } from '@/config/metrics';
import type { MetricEntry, CustomMetric } from '@/types';
import useLocalStorage from '@/hooks/use-local-storage';
import { trendExplanation, TrendExplanationInput } from '@/ai/flows/trend-explanation';
import { Loader2, Lightbulb, AlertTriangle, Search } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { format, subDays, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';

const TrendDateRangeSelector = ({ onRangeSelect }: { onRangeSelect: (days: number) => void }) => {
  const ranges = [
    { label: '7 derniers jours', value: 7 },
    { label: '30 derniers jours', value: 30 },
    { label: '90 derniers jours', value: 90 },
  ];
  const [selectedRange, setSelectedRange] = useState<string>("30");

  useEffect(() => {
    onRangeSelect(parseInt(selectedRange));
  }, [selectedRange, onRangeSelect]);

  return (
    <Select value={selectedRange} onValueChange={setSelectedRange}>
      <SelectTrigger className="w-full sm:w-[200px]">
        <SelectValue placeholder="Sélectionner période" />
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
      setError("Veuillez sélectionner une métrique à analyser.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setExplanation(null);

    try {
      const metricDef = findMetricDefinition(selectedMetricId, customMetrics);
      if (!metricDef) {
        throw new Error("Définition de la métrique non trouvée.");
      }

      const fromDate = subDays(new Date(), selectedPeriodDays);
      const relevantEntries = metricEntries
        .filter(entry => {
            const entryDate = parseISO(entry.date);
            return entry.metricId === selectedMetricId && isValid(entryDate) && entryDate >= fromDate;
        })
        .map(entry => ({ date: entry.date, value: entry.value })); 

      if (relevantEntries.length < 3) { 
        setError(`Pas assez de données pour ${metricDef.name} sur les ${selectedPeriodDays} derniers jours pour analyser une tendance. Au moins 3 points de données sont recommandés.`);
        setIsLoading(false);
        return;
      }
      
      const input: TrendExplanationInput = {
        metricsData: JSON.stringify(relevantEntries),
        trendDescription: `Analysez la tendance pour ${metricDef.name} (${metricDef.unit}) sur les ${selectedPeriodDays} derniers jours. Nombre de points de données: ${relevantEntries.length}. La date d'aujourd'hui est ${format(new Date(), 'dd/MM/yyyy', { locale: fr })}. Répondez en français.`,
      };

      const result = await trendExplanation(input);
      setExplanation(result.explanation);

    } catch (e: any) {
      console.error("Erreur lors de l'analyse de la tendance:", e);
      setError(e.message || "Échec de l'analyse de la tendance. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePeriodChange = useCallback((days: number) => {
    setSelectedPeriodDays(days);
  }, []);


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Analyseur de Tendances</CardTitle>
          <CardDescription>
            Découvrez des modèles et des corrélations dans vos métriques de vie grâce à l'analyse IA.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1 min-w-0">
              <label htmlFor="metric-select" className="block text-sm font-medium text-foreground mb-1">Sélectionner la Métrique</label>
              <Select value={selectedMetricId} onValueChange={setSelectedMetricId}>
                <SelectTrigger id="metric-select" className="w-full sm:w-[240px]">
                  <SelectValue placeholder="Choisir une métrique" />
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
            <div className="flex-1 min-w-0">
               <label htmlFor="period-select" className="block text-sm font-medium text-foreground mb-1">Sélectionner la Période</label>
              <TrendDateRangeSelector onRangeSelect={handlePeriodChange} />
            </div>
            <Button onClick={handleAnalyzeTrend} disabled={isLoading || !selectedMetricId} className="w-full sm:w-auto mt-4 sm:mt-0 self-end">
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Analyser la Tendance
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Analyse en cours...
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
              Erreur d'Analyse
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
              Aperçu de la Tendance
            </CardTitle>
             <CardDescription>
              Explication générée par IA pour {findMetricDefinition(selectedMetricId, customMetrics)?.name} sur les {selectedPeriodDays} derniers jours.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none text-foreground">
              {explanation.split('\n').map((paragraph, index) => ( // Changed \\n to \n for direct newlines
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
            <p className="text-lg font-medium">Prêt à découvrir des informations ?</p>
            <p className="text-muted-foreground">Sélectionnez une métrique et une période, puis cliquez sur "Analyser la Tendance".</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
