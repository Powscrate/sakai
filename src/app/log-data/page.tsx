// src/app/log-data/page.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PREDEFINED_METRICS, findMetricDefinition } from '@/config/metrics';
import type { MetricEntry, CustomMetric } from '@/types';
import useLocalStorage from '@/hooks/use-local-storage';
import { cn } from '@/lib/utils';
import { CalendarIcon, PlusCircle, Trash2, Edit3 } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
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
import { Skeleton } from '@/components/ui/skeleton';

const formSchema = z.object({
  metricId: z.string().min(1, "Le type de métrique est requis."),
  date: z.date({ required_error: "La date est requise." }),
  value: z.coerce.number().min(0.001, "La valeur doit être positive."),
  notes: z.string().optional(),
});

export default function LogDataPage() {
  const [metricEntries, setMetricEntries] = useLocalStorage<MetricEntry[]>('metricEntries', []);
  const [customMetrics] = useLocalStorage<CustomMetric[]>('customMetrics', []);
  const [editingEntry, setEditingEntry] = useState<MetricEntry | null>(null);
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);

  const allMetricDefinitions = useMemo(() => [...PREDEFINED_METRICS, ...customMetrics], [customMetrics]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      metricId: "", // Will be set by useEffect
      date: undefined, // Will be set by useEffect
      value: undefined,
      notes: "",
    },
  });
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    if (editingEntry) {
      // const metricDef = findMetricDefinition(editingEntry.metricId, customMetrics); // Not strictly needed for reset
      form.reset({
        metricId: editingEntry.metricId,
        date: isValid(parseISO(editingEntry.date)) ? parseISO(editingEntry.date) : new Date(),
        value: editingEntry.value,
        notes: editingEntry.notes || "",
      });
      // if (metricDef) { // This setValue call is fine as it's client-side but reset should handle it
      //   form.setValue('metricId', metricDef.id); 
      // }
    } else {
      form.reset({
        metricId: allMetricDefinitions.length > 0 ? allMetricDefinitions[0].id : "",
        date: new Date(),
        value: undefined,
        notes: "",
      });
    }
  }, [editingEntry, form, allMetricDefinitions, customMetrics, isClient]); // Added allMetricDefinitions


  function onSubmit(values: z.infer<typeof formSchema>) {
    const newEntry: MetricEntry = {
      id: editingEntry ? editingEntry.id : crypto.randomUUID(),
      metricId: values.metricId,
      date: format(values.date, 'yyyy-MM-dd'),
      value: values.value,
      notes: values.notes,
      createdAt: editingEntry ? editingEntry.createdAt : new Date().toISOString(),
    };

    if (editingEntry) {
      setMetricEntries(prev => prev.map(entry => entry.id === editingEntry.id ? newEntry : entry));
      toast({ title: "Entrée Mise à Jour", description: "L'entrée de la métrique a été mise à jour avec succès." });
      setEditingEntry(null);
    } else {
      setMetricEntries(prev => [newEntry, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ));
      toast({ title: "Entrée Enregistrée", description: "Nouvelle entrée de métrique enregistrée avec succès." });
    }
    form.reset({ // Reset with client-side dates
        metricId: allMetricDefinitions.length > 0 ? allMetricDefinitions[0].id : "",
        date: new Date(),
        value: undefined,
        notes: "",
      });
  }
  
  const selectedMetricDef = findMetricDefinition(form.watch('metricId'), customMetrics);

  const handleDeleteEntry = (id: string) => {
    setMetricEntries(prev => prev.filter(entry => entry.id !== id));
    toast({ title: "Entrée Supprimée", description: "L'entrée de la métrique a été supprimée.", variant: "destructive" });
  };

  const handleEditEntry = (entry: MetricEntry) => {
    setEditingEntry(entry);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const recentEntries = useMemo(() => {
    return [...metricEntries]
      .sort((a, b) => {
        const dateA = parseISO(a.date);
        const dateB = parseISO(b.date);
        if (!isValid(dateA) || !isValid(dateB)) return 0;
        return dateB.getTime() - dateA.getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 10);
  }, [metricEntries]);

  if (!isClient) {
     return (
      <div className="space-y-6 animate-pulse">
        <Card>
          <CardHeader><Skeleton className="h-8 w-3/5" /></CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-1/3" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><Skeleton className="h-7 w-1/4" /></CardHeader>
          <CardContent><Skeleton className="h-40 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{editingEntry ? "Modifier l'Entrée de Métrique" : "Enregistrer une Nouvelle Entrée"}</CardTitle>
          <CardDescription>
            {editingEntry ? "Mettez à jour les détails de votre entrée de métrique existante." : "Enregistrez vos métriques quotidiennes pour suivre vos progrès et obtenir des informations."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="metricId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type de Métrique</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une métrique" />
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
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value && isValid(field.value) ? (
                                format(field.value, "PPP", { locale: fr })
                              ) : (
                                <span>Choisir une date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                            locale={fr}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valeur {selectedMetricDef ? `(${selectedMetricDef.unit})` : ''}</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder={selectedMetricDef?.placeholder || "Entrer la valeur"}
                        min={selectedMetricDef?.min}
                        max={selectedMetricDef?.max}
                        step={selectedMetricDef?.step || "any"}
                        {...field}
                        onChange={event => field.onChange(+event.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optionnel)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Détails ou contexte supplémentaires..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {editingEntry ? "Mettre à Jour" : "Enregistrer"}
                </Button>
                {editingEntry && (
                  <Button type="button" variant="outline" onClick={() => { setEditingEntry(null); /* Form reset is handled by useEffect */ }}>
                    Annuler Modification
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Entrées Récentes</CardTitle>
          <CardDescription>Vos 10 dernières entrées de métriques enregistrées.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentEntries.length === 0 ? (
            <p className="text-muted-foreground">Aucune entrée pour l'instant. Enregistrez votre première métrique ci-dessus !</p>
          ) : (
            <ul className="space-y-3">
              {recentEntries.map((entry) => {
                const metricDef = findMetricDefinition(entry.metricId, customMetrics);
                const entryDate = parseISO(entry.date);
                return (
                  <li key={entry.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg shadow-sm">
                    <div className="flex items-center gap-3">
                      {metricDef?.icon && <metricDef.icon className="h-6 w-6 text-primary" />}
                      <div>
                        <p className="font-semibold">
                          {metricDef?.name || entry.metricId}:{' '}
                          <span className="text-primary font-bold">{entry.value}</span>{' '}
                          {metricDef?.unit}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isValid(entryDate) ? format(entryDate, 'PPP', { locale: fr }) : "Date invalide"}
                          {entry.notes && ` - ${entry.notes.substring(0,30)}${entry.notes.length > 30 ? '...' : ''}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <Button variant="ghost" size="icon" onClick={() => handleEditEntry(entry)} aria-label="Modifier l'entrée">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" aria-label="Supprimer l'entrée">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action ne peut pas être annulée. Cela supprimera définitivement cette entrée de métrique.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteEntry(entry.id)} className="bg-destructive hover:bg-destructive/90">
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
