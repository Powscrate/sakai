// src/app/goals/page.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PREDEFINED_METRICS, findMetricDefinition } from '@/config/metrics';
import type { Goal, MetricEntry, MetricDefinition, CustomMetric } from '@/types';
import useLocalStorage from '@/hooks/use-local-storage';
import { cn } from '@/lib/utils';
import { CalendarIcon, Target, PlusCircle, Trash2, Edit3, CheckCircle2, TrendingUp } from 'lucide-react';
import { format, parseISO, isValid, differenceInDays, isAfter, isBefore, startOfDay } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const goalFormSchema = z.object({
  metricId: z.string().min(1, "Metric type is required."),
  description: z.string().min(3, "Description must be at least 3 characters.").max(100, "Description too long."),
  targetValue: z.coerce.number().min(0.001, "Target value must be positive."),
  startDate: z.date({ required_error: "Start date is required." }),
  deadline: z.date({ required_error: "Deadline is required." }),
}).refine(data => data.deadline >= data.startDate, {
  message: "Deadline cannot be before start date.",
  path: ["deadline"],
});

export default function GoalsPage() {
  const [goals, setGoals] = useLocalStorage<Goal[]>('goals', []);
  const [metricEntries] = useLocalStorage<MetricEntry[]>('metricEntries', []);
  const [customMetrics] = useLocalStorage<CustomMetric[]>('customMetrics', []);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const { toast } = useToast();

  const allMetricDefinitions = useMemo(() => [...PREDEFINED_METRICS, ...customMetrics], [customMetrics]);

  const goalForm = useForm<z.infer<typeof goalFormSchema>>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      metricId: PREDEFINED_METRICS[0]?.id || "",
      description: "",
      targetValue: undefined,
      startDate: new Date(),
      deadline: new Date(new Date().setDate(new Date().getDate() + 30)), // Default 30 days later
    },
  });

  useEffect(() => {
    if (editingGoal) {
      goalForm.reset({
        metricId: editingGoal.metricId,
        description: editingGoal.description,
        targetValue: editingGoal.targetValue,
        startDate: parseISO(editingGoal.startDate),
        deadline: parseISO(editingGoal.deadline),
      });
    } else {
       goalForm.reset({
        metricId: PREDEFINED_METRICS[0]?.id || (customMetrics.length > 0 ? customMetrics[0].id : ""),
        description: "",
        targetValue: undefined,
        startDate: new Date(),
        deadline: new Date(new Date().setDate(new Date().getDate() + 30)),
      });
    }
  }, [editingGoal, goalForm, customMetrics]);

  const calculateCurrentValue = (goal: Pick<Goal, 'metricId' | 'startDate' | 'deadline'>): number => {
    const relevantEntries = metricEntries.filter(entry => {
      const entryDate = startOfDay(parseISO(entry.date));
      return entry.metricId === goal.metricId &&
             !isBefore(entryDate, startOfDay(parseISO(goal.startDate))) &&
             !isAfter(entryDate, startOfDay(parseISO(goal.deadline)));
    });
    // This is a simple sum. For averages or other aggregations, this logic would need to change.
    return relevantEntries.reduce((sum, entry) => sum + entry.value, 0);
  };

  function onGoalSubmit(values: z.infer<typeof goalFormSchema>) {
    const partialGoal = {
      metricId: values.metricId,
      startDate: format(values.startDate, 'yyyy-MM-dd'),
      deadline: format(values.deadline, 'yyyy-MM-dd'),
    };
    const currentValue = calculateCurrentValue(partialGoal);

    const newGoal: Goal = {
      id: editingGoal ? editingGoal.id : crypto.randomUUID(),
      metricId: values.metricId,
      description: values.description,
      targetValue: values.targetValue,
      startDate: format(values.startDate, 'yyyy-MM-dd'),
      deadline: format(values.deadline, 'yyyy-MM-dd'),
      currentValue: currentValue,
      isAchieved: currentValue >= values.targetValue,
      createdAt: editingGoal ? editingGoal.createdAt :new Date().toISOString(),
    };

    if (editingGoal) {
      setGoals(prev => prev.map(g => g.id === editingGoal.id ? newGoal : g));
      toast({ title: "Goal Updated", description: "Your goal has been successfully updated." });
      setEditingGoal(null);
    } else {
      setGoals(prev => [newGoal, ...prev].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      toast({ title: "Goal Set", description: "New goal has been successfully set." });
    }
    goalForm.reset({
      metricId: PREDEFINED_METRICS[0]?.id || (customMetrics.length > 0 ? customMetrics[0].id : ""),
      description: "",
      targetValue: undefined,
      startDate: new Date(),
      deadline: new Date(new Date().setDate(new Date().getDate() + 30)),
    });
  }
  
  const selectedMetricDef = findMetricDefinition(goalForm.watch('metricId'), customMetrics);

  const handleDeleteGoal = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
    toast({ title: "Goal Deleted", description: "Goal has been deleted.", variant: "destructive" });
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
     window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Update current values when metricEntries change
  useEffect(() => {
    setGoals(prevGoals => prevGoals.map(goal => {
      const currentValue = calculateCurrentValue(goal);
      return {
        ...goal,
        currentValue,
        isAchieved: currentValue >= goal.targetValue,
      };
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metricEntries]); // Don't add setGoals to dependencies to avoid infinite loop

  const sortedGoals = useMemo(() => {
    return [...goals].sort((a, b) => {
      if (a.isAchieved !== b.isAchieved) return a.isAchieved ? 1 : -1; // Not achieved first
      return differenceInDays(parseISO(a.deadline), new Date()) - differenceInDays(parseISO(b.deadline), new Date()); // Sooner deadline first
    });
  }, [goals]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{editingGoal ? "Edit Goal" : "Set New Goal"}</CardTitle>
          <CardDescription>
            {editingGoal ? "Update the details of your existing goal." : "Define personal targets for your life metrics and track your progress."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...goalForm}>
            <form onSubmit={goalForm.handleSubmit(onGoalSubmit)} className="space-y-8">
              <FormField
                control={goalForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Goal Description</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Run 50km this month" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={goalForm.control}
                  name="metricId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Metric to Track</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a metric" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {allMetricDefinitions.map((metric) => (
                            <SelectItem key={metric.id} value={metric.id}>
                              {metric.name} ({metric.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={goalForm.control}
                  name="targetValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Value {selectedMetricDef ? `(${selectedMetricDef.unit})` : ''}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder={selectedMetricDef?.placeholder || "e.g., 50"}
                           min={selectedMetricDef?.min}
                           step={selectedMetricDef?.step || "any"}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={goalForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={goalForm.control}
                  name="deadline"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Deadline</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < (goalForm.getValues("startDate") || new Date("1900-01-01"))} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {editingGoal ? "Update Goal" : "Set Goal"}
                </Button>
                 {editingGoal && (
                  <Button type="button" variant="outline" onClick={() => { setEditingGoal(null); goalForm.reset(); }}>
                    Cancel Edit
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your Goals</h2>
        {sortedGoals.length === 0 ? (
          <Card className="p-6 text-center">
             <Target className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No goals set yet. Create your first goal above!</p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedGoals.map((goal) => {
              const metricDef = findMetricDefinition(goal.metricId, customMetrics);
              const progress = Math.min(100, (goal.currentValue / goal.targetValue) * 100);
              const daysLeft = differenceInDays(parseISO(goal.deadline), new Date());
              const isOverdue = daysLeft < 0 && !goal.isAchieved;
              
              return (
                <Card key={goal.id} className={cn("flex flex-col", goal.isAchieved && "bg-green-50 border-green-200")}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                           {metricDef?.icon && <metricDef.icon className={cn("h-5 w-5", goal.isAchieved ? "text-green-600" : "text-primary")} />}
                           {goal.description}
                        </CardTitle>
                        <CardDescription>
                          Target: {goal.targetValue} {metricDef?.unit || ''}
                        </CardDescription>
                      </div>
                      {goal.isAchieved && <CheckCircle2 className="h-6 w-6 text-green-600" />}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <Progress value={progress} aria-label={`${metricDef?.name || 'Goal'} progress`} className={cn(goal.isAchieved && "[&>div]:bg-green-500")} />
                    <div className="mt-2 text-sm text-muted-foreground flex justify-between">
                      <span>{goal.currentValue.toFixed(1)} / {goal.targetValue.toFixed(1)} {metricDef?.unit}</span>
                      <span>{progress.toFixed(0)}%</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Deadline: {format(parseISO(goal.deadline), "MMM dd, yyyy")}
                      {isOverdue ? <span className="text-destructive font-semibold"> (Overdue)</span> : 
                       !goal.isAchieved ? <span> ({daysLeft} days left)</span> : <span className="text-green-700 font-semibold"> (Achieved!)</span>
                      }
                    </p>
                  </CardContent>
                  <CardFooter className="flex gap-2 border-t pt-4">
                     <Button variant="outline" size="sm" onClick={() => handleEditGoal(goal)} className="flex-1">
                        <Edit3 className="mr-1 h-3 w-3" /> Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-1">
                            <Trash2 className="mr-1 h-3 w-3" /> Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Goal?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the goal "{goal.description}". This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteGoal(goal.id)} className="bg-destructive hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
