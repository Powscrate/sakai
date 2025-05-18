// src/types/index.ts
import type { LucideIcon } from 'lucide-react';

export type MetricId = 'exercise' | 'sleep' | 'mood' | 'water' | string;

export interface MetricDefinition {
  id: MetricId;
  name: string;
  unit: string;
  icon: LucideIcon;
  color?: string; // Optional color for charts, e.g., 'hsl(var(--chart-1))'
  placeholder?: string; // Placeholder for input field
  min?: number;
  max?: number;
  step?: number;
}

export interface MetricEntry {
  id: string; // unique id for the entry, e.g., uuid
  metricId: MetricId;
  date: string; // ISO string (e.g., YYYY-MM-DD)
  value: number;
  notes?: string;
  createdAt: string; // ISO string timestamp
}

export interface Goal {
  id: string; // unique id for the goal
  metricId: MetricId;
  description: string;
  targetValue: number;
  currentValue: number; // Calculated based on metric entries
  startDate: string; // ISO string (e.g., YYYY-MM-DD)
  deadline: string; // ISO string (e.g., YYYY-MM-DD)
  isAchieved: boolean;
  createdAt: string; // ISO string timestamp
}

export interface CustomMetric extends MetricDefinition {
  isCustom: true;
}
