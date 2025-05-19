
"use client";
import { useState, useMemo } from 'react';
import type { SandpackFiles } from '@codesandbox/sandpack-react';
import { PromptForm } from '@/components/builder/prompt-form';
import { CodePreview } from '@/components/builder/code-preview';
import { generateProjectFiles, type GenerateProjectOutput } from '@/ai/flows/generate-project-flow';
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { SakaiLogo } from '@/components/icons/logo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const defaultProjectName = "sakai-hello-app";

// Robust function to ensure all essential files for a Vite + React TS + Tailwind project are present and correct
const ensureEssentialFiles = (aiFiles: Record<string, string> | null | undefined): SandpackFiles => {
  const files: SandpackFiles = {};

  // Convert AI files to SandpackFiles format if they exist, prioritizing AI's version
  if (aiFiles) {
    for (const path in aiFiles) {
      const sandpackPath = path.startsWith('/') ? path : `/${path}`;
      files[sandpackPath] = { code: aiFiles[path] };
    }
  }

  // 1. package.json
  let pkgJson: any = {};
  if (files['/package.json']?.code) {
    try {
      pkgJson = JSON.parse(files['/package.json'].code);
    } catch (e) {
      console.warn("AI-provided package.json is invalid. Using defaults and attempting to merge.", e);
      pkgJson = {}; // Start fresh if AI's is broken
    }
  }
  pkgJson.name = pkgJson.name || `${defaultProjectName}-${Date.now().toString(36)}`;
  pkgJson.private = pkgJson.private !== undefined ? pkgJson.private : true;
  pkgJson.type = pkgJson.type || "module";
  pkgJson.scripts = { dev: "vite", build: "vite build", ...pkgJson.scripts };
  
  const defaultDependencies = {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "lucide-react": "^0.475.0", // Ensure lucide-react is present
  };
  pkgJson.dependencies = { ...defaultDependencies, ...pkgJson.dependencies };

  const defaultDevDependencies = {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.0.3",
    "vite": "^4.4.5", // Vite must be a devDependency
    "typescript": "^5.0.2",
    "tailwindcss": "^3.3.3",
    "postcss": "^8.4.27",
    "autoprefixer": "^10.4.14",
  };
  pkgJson.devDependencies = { ...defaultDevDependencies, ...pkgJson.devDependencies };
  files['/package.json'] = { code: JSON.stringify(pkgJson, null, 2) };


  // 2. vite.config.ts
  if (!files['/vite.config.ts']?.code) {
    files['/vite.config.ts'] = {
      code: `
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
})
      `,
    };
  }

  // 3. tailwind.config.js
  if (!files['/tailwind.config.js']?.code) {
    files['/tailwind.config.js'] = {
      code: `
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
      `,
    };
  }
  
  // 4. postcss.config.js
  if (!files['/postcss.config.js']?.code) {
    files['/postcss.config.js'] = {
      code: `
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
      `,
    };
  }

  // 5. index.html (root)
  if (!files['/index.html']?.code) {
    files['/index.html'] = {
      code: `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${pkgJson.name || 'Sakai Builder App'}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
      `,
    };
  }

  // 6. src/main.tsx
  if (!files['/src/main.tsx']?.code) {
    files['/src/main.tsx'] = {
      code: `
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css' // Import Tailwind CSS

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
      `,
    };
  }

  // 7. src/index.css
  if (!files['/src/index.css']?.code) {
    files['/src/index.css'] = {
      code: `
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;
  color-scheme: light dark; /* Basic dark mode support for Vite default */
  background-color: #ffffff; /* Default light background */
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  margin: 0;
  padding: 1rem;
}

@media (prefers-color-scheme: dark) {
  body {
    background-color: #242424; /* Default dark background for Vite apps */
  }
}
      `,
    };
  }
  
  // 8. Default App.tsx if not provided by AI or is invalid
  if (!files['/src/App.tsx']?.code || files['/src/App.tsx'].code.trim() === "") {
      files['/src/App.tsx'] = {
        code: `
import { Smile } from 'lucide-react';

function App() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 text-slate-800 dark:text-slate-100 p-8 text-center">
      <Smile className="w-24 h-24 text-teal-500 dark:text-teal-400 mb-8 animate-bounce" data-ai-hint="smile face" />
      <h1 className="text-5xl md:text-6xl font-bold mb-6">
        Hello <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-cyan-600 dark:from-teal-400 dark:to-cyan-500">Sakai</span>!
      </h1>
      <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-300 max-w-lg">
        This is your default generated application. Describe the project you want to build in the panel on the left!
      </p>
    </div>
  )
}
export default App
        `,
        active: true, // Make it active by default
      };
  }

  // Ensure an active file is set if not already done by App.tsx
  const hasActiveFile = Object.values(files).some(f => f.active);
  if (!hasActiveFile) {
    const potentialActiveFiles = ['/src/App.tsx', '/src/main.tsx', '/index.html'];
    for (const paf of potentialActiveFiles) {
        if (files[paf] && !files[paf].hidden) {
            files[paf].active = true;
            break;
        }
    }
  }
  
  // Make sure no file has empty code, replace with a comment if so
  for (const path in files) {
    if (files[path].code.trim() === "" && path !== "/package.json") { // Allow empty package.json initially if AI fails
        files[path].code = `// ${path} - AI generated empty or invalid file, replaced by Sakai Builder.`;
    }
  }

  return files;
};


export default function SakaiBuilderPage() {
  const [prompt, setPrompt] = useState<string>(""); // Initial prompt is empty
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize initial files to show the default "Hello Sakai" project
  const initialSandpackFiles = useMemo(() => ensureEssentialFiles(null), []);
  const [generatedFiles, setGeneratedFiles] = useState<SandpackFiles | null>(initialSandpackFiles);


  const handleGenerateProject = async (currentPrompt: string) => {
    if (!currentPrompt.trim()) {
        setError("Veuillez entrer une description pour votre projet.");
        return;
    }
    setIsLoading(true);
    setError(null);
    // setGeneratedFiles(null); // Optionally clear previous preview or show loading state in preview

    try {
      const result: GenerateProjectOutput = await generateProjectFiles({ userInputPrompt: currentPrompt });
      if (result.error) {
        setError(`Erreur de génération IA : ${result.error}. Veuillez vérifier la console du serveur pour plus de détails. Affichage du projet par défaut.`);
        console.error("AI Generation Error from flow:", result.error);
        setGeneratedFiles(ensureEssentialFiles(null)); // Revert to default on error
      } else if (result.files) {
        const sandpackReadyFiles = ensureEssentialFiles(result.files);
        setGeneratedFiles(sandpackReadyFiles);
      } else {
        setError("L'IA n'a retourné aucun fichier. Le projet par défaut est affiché. Veuillez réessayer ou modifier votre prompt.");
        setGeneratedFiles(ensureEssentialFiles(null)); // Revert to default
      }
    } catch (e: any) {
      console.error("Error calling generateProjectFiles in Page:", e);
      setError(e.message || "Une erreur inattendue est survenue lors de la génération du projet. Affichage du projet par défaut.");
      setGeneratedFiles(ensureEssentialFiles(null)); // Revert to default
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="p-4 border-b bg-card flex items-center justify-between shrink-0 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/" passHref>
            <Button variant="ghost" size="icon" aria-label="Retour à l'accueil">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <SakaiLogo className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-semibold">Sakai Builder</h1>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[400px_1fr] xl:grid-cols-[450px_1fr] gap-px bg-border overflow-hidden">
        {/* Left Pane: Prompt Form */}
        <div className="bg-card flex flex-col p-1 overflow-y-auto">
            <Card className="flex-1 flex flex-col shadow-none border-0 rounded-none">
                <CardHeader>
                    <CardTitle className="text-lg">Décrivez votre projet</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                    <PromptForm
                        initialPrompt={prompt} 
                        onSubmitPrompt={handleGenerateProject}
                        isLoading={isLoading}
                    />
                    {isLoading && (
                        <div className="mt-4 flex items-center justify-center text-muted-foreground p-4 bg-muted/50 rounded-md">
                            <Loader2 className="h-6 w-6 animate-spin mr-3" />
                            <div>
                                <p className="font-semibold">Sakai est en train de construire...</p>
                                <p className="text-xs">Génération des fichiers et configuration du projet. Veuillez patienter.</p>
                            </div>
                        </div>
                    )}
                    {error && (
                        <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-md flex items-start gap-2.5">
                            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-sm">Erreur de génération</p>
                                <p className="text-xs break-words">{error}</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>

        {/* Right Pane: Code Preview (Sandpack - Preview Only) */}
        <div className="bg-background flex flex-col overflow-hidden">
          <CodePreview files={generatedFiles} />
        </div>
      </div>
    </div>
  );
}

    