
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

const defaultProjectName = "sakai-builder-app";

// Default files for Sandpack to ensure Tailwind and Vite work
const ensureEssentialFiles = (aiFiles: Record<string, string> | null | undefined): SandpackFiles => {
  const files: SandpackFiles = {};

  // Convert AI files to SandpackFiles format if they exist
  if (aiFiles) {
    for (const path in aiFiles) {
      const sandpackPath = path.startsWith('/') ? path : `/${path}`;
      files[sandpackPath] = { code: aiFiles[path] };
    }
  }

  // 1. Ensure package.json
  let pkgJson: any = {};
  if (files['/package.json']?.code) {
    try {
      pkgJson = JSON.parse(files['/package.json'].code);
    } catch (e) {
      console.warn("AI provided package.json is not valid JSON. Using defaults.", e);
      pkgJson = {}; // Reset if parsing fails
    }
  }

  pkgJson.name = pkgJson.name || `${defaultProjectName}-${Date.now()}`;
  pkgJson.private = pkgJson.private !== undefined ? pkgJson.private : true;
  pkgJson.scripts = { ...pkgJson.scripts, dev: "vite", build: "vite build" };
  pkgJson.dependencies = {
    react: "^18.2.0",
    "react-dom": "^18.2.0",
    ...pkgJson.dependencies,
  };
  pkgJson.devDependencies = {
    "@vitejs/plugin-react": "^4.0.3",
    "vite": "^4.4.5", // Vite must be a devDependency
    "typescript": "^5.0.2",
    "tailwindcss": "^3.3.3",
    "postcss": "^8.4.27",
    "autoprefixer": "^10.4.14",
    ...pkgJson.devDependencies,
  };
  files['/package.json'] = { code: JSON.stringify(pkgJson, null, 2) };

  // 2. Ensure vite.config.ts
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

  // 3. Ensure tailwind.config.js
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
  
  // 4. Ensure postcss.config.js
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

  // 5. Ensure index.html
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

  // 6. Ensure src/main.tsx entry point
  if (!files['/src/main.tsx']?.code) {
    files['/src/main.tsx'] = {
      code: `
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
      `,
    };
  }

  // 7. Ensure src/index.css for Tailwind directives
  if (!files['/src/index.css']?.code) {
    files['/src/index.css'] = {
      code: `
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: sans-serif;
  background-color: #f0f0f0; /* Default light background */
  color: #333; /* Default text color */
  margin: 0;
  padding: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}
      `,
    };
  }
  
  // 8. Default App.tsx if not provided by AI or main.tsx expects it
  const mainTsxContent = files['/src/main.tsx']?.code || "";
  const appTsxExpected = mainTsxContent.includes("import App from './App.tsx'") || mainTsxContent.includes("<App />");

  if (!files['/src/App.tsx']?.code && appTsxExpected) {
      files['/src/App.tsx'] = {
        code: `
// Default App.tsx by Sakai Builder
function App() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 text-slate-800 p-10 text-center">
      <img src="https://placehold.co/100x100.png" alt="Sakai Logo Placeholder" className="mb-6 rounded-full shadow-lg" data-ai-hint="logo brand" />
      <h1 className="text-5xl font-bold text-teal-600 mb-4">
        Hello Sakai!
      </h1>
      <p className="text-xl text-slate-600">
        This is your default AI-generated application.
      </p>
      <p className="text-slate-500 mt-3 text-sm">
        Edit <code className="bg-slate-200 p-1 rounded text-teal-700">src/App.tsx</code> to get started, or provide a new prompt to Sakai Builder.
      </p>
    </div>
  )
}
export default App
        `,
      };
  }

  // Ensure an active file is set for Sandpack editor
  const hasActiveFile = Object.values(files).some(f => f.active);
  if (!hasActiveFile && files['/src/App.tsx']) {
      files['/src/App.tsx'].active = true;
  } else if (!hasActiveFile && Object.keys(files).length > 0) {
      // Fallback to the first available non-hidden TSX/TS file in src or root App.tsx
      const potentialActiveFiles = ['/src/App.tsx', '/App.tsx', '/src/main.tsx'];
      let foundActive = false;
      for (const paf of potentialActiveFiles) {
          if (files[paf] && !files[paf].hidden) {
              files[paf].active = true;
              foundActive = true;
              break;
          }
      }
      if (!foundActive) {
        const firstSrcTsx = Object.keys(files).find(f => f.startsWith('/src/') && (f.endsWith('.tsx') || f.endsWith('.ts')) && !files[f].hidden);
        if (firstSrcTsx && files[firstSrcTsx]) {
            files[firstSrcTsx].active = true;
        } else if (files['/src/main.tsx']) { // Ultimate fallback for entry
            files['/src/main.tsx'].active = true;
        }
      }
  }

  return files;
};


export default function SakaiBuilderPage() {
  const [prompt, setPrompt] = useState<string>(""); // Initial prompt is empty
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize initial files to avoid re-computation on every render
  const initialSandpackFiles = useMemo(() => ensureEssentialFiles(null), []);
  const [generatedFiles, setGeneratedFiles] = useState<SandpackFiles | null>(initialSandpackFiles);


  const handleGenerateProject = async (currentPrompt: string) => {
    if (!currentPrompt.trim()) {
        setError("Veuillez entrer une description pour votre projet.");
        return;
    }
    setIsLoading(true);
    // Do not clear generatedFiles here, so the old preview remains until new one is ready
    setError(null);

    try {
      const result: GenerateProjectOutput = await generateProjectFiles({ userInputPrompt: currentPrompt });
      if (result.error) {
        setError(result.error);
        console.error("AI Generation Error from flow:", result.error);
        // Keep the previous generatedFiles or initialSandpackFiles if generation fails
        setGeneratedFiles(prevFiles => prevFiles || initialSandpackFiles);
      } else if (result.files) {
        const sandpackReadyFiles = ensureEssentialFiles(result.files);
        setGeneratedFiles(sandpackReadyFiles);
      } else {
        setError("L'IA n'a retourné aucun fichier. Le projet par défaut est affiché. Veuillez réessayer ou modifier votre prompt.");
        setGeneratedFiles(initialSandpackFiles); // Revert to default if AI returns nothing
      }
    } catch (e: any) {
      console.error("Error calling generateProjectFiles in Page:", e);
      setError(e.message || "Une erreur inattendue est survenue lors de la génération du projet.");
      setGeneratedFiles(prevFiles => prevFiles || initialSandpackFiles);
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
                    <CardTitle className="text-lg">Description de votre projet</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                    <PromptForm
                        initialPrompt={prompt} // Now starts empty
                        onSubmitPrompt={handleGenerateProject}
                        isLoading={isLoading}
                    />
                    {isLoading && (
                        <div className="mt-4 flex items-center justify-center text-muted-foreground p-4 bg-muted/50 rounded-md">
                            <Loader2 className="h-6 w-6 animate-spin mr-3" />
                            <div>
                                <p className="font-semibold">Génération en cours...</p>
                                <p className="text-xs">Sakai prépare votre projet, veuillez patienter.</p>
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

        {/* Right Pane: Code Preview */}
        <div className="bg-card flex flex-col overflow-hidden">
          {/* Pass generatedFiles which defaults to initialSandpackFiles */}
          <CodePreview files={generatedFiles} />
        </div>
      </div>
    </div>
  );
}

    