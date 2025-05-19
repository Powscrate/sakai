
"use client";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface PromptFormProps {
  initialPrompt?: string;
  onSubmitPrompt: (prompt: string) => void;
  isLoading: boolean;
}

export function PromptForm({ initialPrompt = "", onSubmitPrompt, isLoading }: PromptFormProps) {
  const [prompt, setPrompt] = useState<string>(initialPrompt);

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
          placeholder="Ex: Une application de gestion de tâches simple avec React, TypeScript et Tailwind CSS, permettant d'ajouter et de supprimer des tâches."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[200px] flex-1 resize-none bg-background text-sm p-3"
          disabled={isLoading}
          rows={10}
        />
         <p className="text-xs text-muted-foreground">
          Sakai tentera de générer un projet Vite + React + TypeScript + Tailwind CSS.
        </p>
      </div>
      <Button type="submit" disabled={isLoading || !prompt.trim()} className="w-full">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Génération en cours...
          </>
        ) : (
          "Générer le projet"
        )}
      </Button>
    </form>
  );
}
