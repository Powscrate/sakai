
"use client";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Wand2 } from 'lucide-react'; // Using Wand2 for generate button

interface PromptFormProps {
  initialPrompt?: string;
  onSubmitPrompt: (prompt: string) => void;
  isLoading: boolean;
}

export function PromptForm({ initialPrompt = "", onSubmitPrompt, isLoading }: PromptFormProps) {
  const [prompt, setPrompt] = useState<string>(initialPrompt);

  useEffect(() => {
    setPrompt(initialPrompt);
  }, [initialPrompt]);


  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading) {
      onSubmitPrompt(prompt.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full gap-4">
      <div className="grid w-full gap-1.5 flex-1">
        <Label htmlFor="project-prompt" className="text-sm font-medium">
          Décrivez l'application que vous souhaitez générer :
        </Label>
        <Textarea
          id="project-prompt"
          placeholder="Ex: Une application de suivi de tâches simple avec ajout, suppression et marquage comme complété. Utilisez des icônes Lucide et un style moderne avec Tailwind."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[200px] flex-1 resize-none bg-background text-sm p-3 rounded-md shadow-sm focus-visible:ring-primary/80"
          disabled={isLoading}
          rows={10}
        />
         <p className="text-xs text-muted-foreground">
          Sakai tentera de générer un projet complet (Vite + React + TypeScript + Tailwind CSS + Lucide Icons). Soyez aussi précis que possible.
        </p>
      </div>
      <Button type="submit" disabled={isLoading || !prompt.trim()} className="w-full font-semibold py-3 text-base">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Génération en cours...
          </>
        ) : (
          <>
            <Wand2 className="mr-2 h-5 w-5" />
            Générer le projet
          </>
        )}
      </Button>
    </form>
  );
}

    