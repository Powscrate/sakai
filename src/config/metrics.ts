// src/config/metrics.ts
import type { MetricDefinition } from '@/types';
import { Activity, BedDouble, Droplets, Smile } from 'lucide-react'; // SmileHeart remplacé par Smile

export const PREDEFINED_METRICS: MetricDefinition[] = [
  { 
    id: 'exercise', 
    name: 'Exercice', 
    unit: 'minutes', 
    icon: Activity, 
    color: 'hsl(var(--chart-1))',
    placeholder: 'ex: 30',
    min: 0,
    step: 5,
  },
  { 
    id: 'sleep', 
    name: 'Sommeil', 
    unit: 'heures', 
    icon: BedDouble, 
    color: 'hsl(var(--chart-2))',
    placeholder: 'ex: 7.5',
    min: 0,
    max: 24,
    step: 0.5,
  },
  { 
    id: 'mood', 
    name: 'Humeur', 
    unit: 'échelle 1-5', 
    icon: Smile, // Icone changée
    color: 'hsl(var(--chart-3))',
    placeholder: '1 (bas) à 5 (haut)',
    min: 1,
    max: 5,
    step: 1,
  },
  { 
    id: 'water', 
    name: 'Eau Consommée', 
    unit: 'verres', 
    icon: Droplets, 
    color: 'hsl(var(--chart-4))',
    placeholder: 'ex: 8',
    min: 0,
    step: 1,
  },
];

export const findMetricDefinition = (metricId: MetricId, customMetrics: MetricDefinition[] = []): MetricDefinition | undefined => {
  return PREDEFINED_METRICS.find(m => m.id === metricId) || customMetrics.find(m => m.id === metricId);
};
