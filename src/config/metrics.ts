// src/config/metrics.ts
import type { MetricDefinition } from '@/types';
import { Activity, BedDouble, Droplets, FileHeart } from 'lucide-react';

export const PREDEFINED_METRICS: MetricDefinition[] = [
  { 
    id: 'exercise', 
    name: 'Exercise', 
    unit: 'minutes', 
    icon: Activity, 
    color: 'hsl(var(--chart-1))',
    placeholder: 'e.g., 30',
    min: 0,
    step: 5,
  },
  { 
    id: 'sleep', 
    name: 'Sleep', 
    unit: 'hours', 
    icon: BedDouble, 
    color: 'hsl(var(--chart-2))',
    placeholder: 'e.g., 7.5',
    min: 0,
    max: 24,
    step: 0.5,
  },
  { 
    id: 'mood', 
    name: 'Mood', 
    unit: '1-5 scale', 
    icon: FileHeart, 
    color: 'hsl(var(--chart-3))',
    placeholder: '1 (low) to 5 (high)',
    min: 1,
    max: 5,
    step: 1,
  },
  { 
    id: 'water', 
    name: 'Water Intake', 
    unit: 'glasses', 
    icon: Droplets, 
    color: 'hsl(var(--chart-4))',
    placeholder: 'e.g., 8',
    min: 0,
    step: 1,
  },
];

export const findMetricDefinition = (metricId: MetricId, customMetrics: MetricDefinition[] = []): MetricDefinition | undefined => {
  return PREDEFINED_METRICS.find(m => m.id === metricId) || customMetrics.find(m => m.id === metricId);
};

