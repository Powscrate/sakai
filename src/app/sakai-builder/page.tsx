
"use client";
import { useState } from 'react';
import type { SandpackFiles } from '@codesandbox/sandpack-react';
import { PromptForm } from '@/components/builder/prompt-form';
import { CodePreview } from '@/components/builder/code-preview';
import { generateProjectFiles, type GenerateProjectOutput } from '@/ai/flows/generate-project-flow';
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { SakaiLogo } from '@/components/icons/logo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Default files for Sandpack to ensure Tailwind works if AI doesn't provide all
const ensureEssentialFiles = (aiFiles: Record<string, string>): SandpackFiles => {
  const files: SandpackFiles = {};

  // Convert AI files to SandpackFiles format
  for (const path in aiFiles) {
    // Ensure path starts with /
    const sandpackPath = path.startsWith('/') ? path : `/${path}`;
    files[sandpackPath] = { code: aiFiles[path] };
  }

  // Ensure package.json
  if (!files['/package.json']) {
    files['/package.json'] = {
      code: JSON.stringify({
        name: "sakai-builder-default-app",
        version: "0.1.0",
        private: true,
        scripts: {
          dev: "vite", // Essential for Sandpack Vite template
          build: "vite build",
          lint: "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
          preview: "vite preview"
        },
        dependencies: {
          react: "^18.2.0",
          "react-dom": "^18.2.0"
        },
        devDependencies: {
          "@types/react": "^18.2.15",
          "@types/react-dom": "^18.2.7",
          "@vitejs/plugin-react": "^4.0.3",
          "autoprefixer": "^10.4.14",
          "eslint": "^8.45.0",
          "postcss": "^8.4.27",
          "tailwindcss": "^3.3.3",
          "typescript": "^5.0.2",
          "vite": "^4.4.5" // Vite must be a dev dependency
        }
      }, null, 2),
      hidden: false, // Make it visible for debugging if needed
    };
  } else {
    try {
      const pkgJson = JSON.parse(files['/package.json'].code);
      if (!pkgJson.name) {
        pkgJson.name = "sakai-builder-ai-app"; // Add a default name if missing
      }
      if (!pkgJson.scripts) {
        pkgJson.scripts = {};
      }
      if (!pkgJson.scripts.dev) {
        pkgJson.scripts.dev = "vite"; // Ensure dev script for Vite
      }
      if (!pkgJson.devDependencies) {
        pkgJson.devDependencies = {};
      }
      if (!pkgJson.devDependencies.vite) {
         pkgJson.devDependencies.vite = "^4.4.5"; // Ensure vite is a dev dep
      }
      if (!pkgJson.devDependencies.tailwindcss) {
        pkgJson.devDependencies.tailwindcss = "^3.3.3";
      }
       if (!pkgJson.devDependencies.postcss) {
        pkgJson.devDependencies.postcss = "^8.4.27";
      }
       if (!pkgJson.devDependencies.autoprefixer) {
        pkgJson.devDependencies.autoprefixer = "^10.4.14";
      }
      if (!pkgJson.dependencies) {
        pkgJson.dependencies = {};
      }
      if (!pkgJson.dependencies.react) {
        pkgJson.dependencies.react = "^18.2.0";
      }
      if (!pkgJson.dependencies['react-dom']) {
        pkgJson.dependencies['react-dom'] = "^18.2.0";
      }


      files['/package.json'].code = JSON.stringify(pkgJson, null, 2);
    } catch (e) {
      console.warn("AI provided package.json is not valid JSON. Sandpack might use defaults or fail.", e);
      // Potentially replace with default if parsing completely fails and it's critical
    }
  }


  // Ensure vite.config.ts
  if (!files['/vite.config.ts']) {
    files['/vite.config.ts'] = {
      code: `
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
})
      `,
      hidden: true,
    };
  }

  // Ensure tailwind.config.js
  if (!files['/tailwind.config.js']) {
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
      hidden: true,
    };
  }

  // Ensure postcss.config.js
  if (!files['/postcss.config.js']) {
    files['/postcss.config.js'] = {
      code: `
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
      `,
      hidden: true,
    };
  }

  // Ensure index.html
  if (!files['/index.html']) {
    files['/index.html'] = {
      code: `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sakai Builder App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
      `,
      hidden: false, // Important for Vite template
    };
  }

  // Ensure src/main.tsx entry point
   if (!files['/src/main.tsx']) {
    files['/src/main.tsx'] = {
      code: `
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx' // Assumes App.tsx exists or will be created
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
      `,
    };
  }


  // Ensure src/index.css for Tailwind directives
  if (!files['/src/index.css']) {
    files['/src/index.css'] = {
      code: `
@tailwind base;
@tailwind components;
@tailwind utilities;
      `,
    };
  }

  // Default App.tsx if not provided (or if main.tsx expects it)
  const mainTsxContent = files['/src/main.tsx']?.code || "";
  const appTsxExpected = mainTsxContent.includes("import App from './App.tsx'") || mainTsxContent.includes("<App />");

  if (!files['/src/App.tsx'] && appTsxExpected) {
      files['/src/App.tsx'] = {
        code: `
// Default App.tsx generated by Sakai Builder fallback
function App() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-10">
      <h1 className="text-4xl font-bold text-teal-400 mb-6">
        Welcome to Your AI-Generated App!
      </h1>
      <p className="text-lg text-slate-300">
        Sakai Builder generated this basic structure.
      </p>
      <p className="text-slate-400 mt-2">
        Edit <code className="bg-slate-700 p-1 rounded">src/App.tsx</code> to get started.
      </p>
    </div>
  )
}
export default App
        `,
      };
  }

  // Set an active file if not already set by AI (and /src/App.tsx exists)
  const hasActiveFile = Object.values(files).some(f => f.active);
  if (!hasActiveFile && files['/src/App.tsx']) {
      files['/src/App.tsx'].active = true;
  } else if (!hasActiveFile && files['/App.tsx']) { // Fallback for older template
      files['/App.tsx'].active = true;
  } else if (!hasActiveFile && files['/src/main.tsx']) {
      files['/src/main.tsx'].active = true;
  }


  return files;
};


export default function SakaiBuilderPage() {
  const [prompt, setPrompt] = useState<string>("Crée une application simple de compteur en React avec Tailwind CSS. Elle doit avoir un bouton pour incrémenter, un pour décrémenter, et afficher le compte actuel. Assure-toi que le `package.json` a un nom unique et tous les scripts et dépendances nécessaires pour Vite et Tailwind.");
  const [generatedFiles, setGeneratedFiles] = useState<SandpackFiles | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateProject = async (currentPrompt: string) => {
    setIsLoading(true);
    setGeneratedFiles(null);
    setError(null);

    try {
      const result: GenerateProjectOutput = await generateProjectFiles({ userInputPrompt: currentPrompt });
      if (result.error) {
        setError(result.error);
        console.error("AI Generation Error:", result.error);
      } else if (result.files) {
        const sandpackReadyFiles = ensureEssentialFiles(result.files);
        setGeneratedFiles(sandpackReadyFiles);
      } else {
        setError("L'IA n'a retourné aucun fichier. Veuillez réessayer ou modifier votre prompt.");
      }
    } catch (e: any) {
      console.error("Error calling generateProjectFiles in Page:", e);
      setError(e.message || "Une erreur inattendue est survenue lors de la génération du projet.");
    } finally {
      setIsLoading(false);
    }
  };

  const initialSandpackFiles = ensureEssentialFiles({
    '/src/App.tsx': `
// Sakai Builder - Initial View
function App() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-gray-800 text-white p-10 antialiased">
      <header className="mb-10 text-center">
        <div className="inline-block p-4 bg-white/10 rounded-full shadow-xl mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="currentColor" className="h-16 w-16 text-teal-400">
            <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="5" fill="none" />
            <circle cx="50" cy="50" r="15" fill="currentColor" />
            <path d="M50 30 A20 20 0 0 1 50 70 A20 20 0 0 1 50 30 M50 40 A10 10 0 0 0 50 60 A10 10 0 0 0 50 40" fill="hsl(var(--background))" />
          </svg>
        </div>
        <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-sky-400">Sakai Builder</h1>
        <p className="text-xl text-slate-400 mt-3">
          Donnez vie à vos idées. Décrivez l'application que vous souhaitez construire.
        </p>
      </header>
      <div className="bg-white/5 p-8 rounded-xl shadow-2xl max-w-lg text-center">
        <p className="text-lg text-slate-300">
          Par exemple: <em className="text-teal-300 font-medium">&ldquo;Crée une application de todo list simple avec des cartes pour chaque tâche, utilisant React et Tailwind CSS.&rdquo;</em>
        </p>
         <p className="text-sm text-slate-500 mt-4">Utilisez le panneau de gauche pour commencer.</p>
      </div>
       <footer className="mt-16 text-center text-slate-500 text-sm">
          <p>&copy; ${new Date().getFullYear()} Sakai AI. Créé par Mampionontiako T.E.T.</p>
        </footer>
    </div>
  )
}
export default App
    `
  });


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
                        initialPrompt={prompt}
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
          <CodePreview files={generatedFiles || initialSandpackFiles} />
        </div>
      </div>
    </div>
  );
}
