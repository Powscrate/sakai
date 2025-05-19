
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
    files[path] = { code: aiFiles[path] };
  }

  // Ensure package.json
  if (!files['/package.json']) {
    files['/package.json'] = {
      code: JSON.stringify({
        name: "sakai-builder-app",
        version: "0.1.0",
        private: true,
        scripts: {
          dev: "vite",
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
          "vite": "^4.4.5"
        }
      }, null, 2),
      hidden: true,
    };
  } else {
     // Ensure package.json has a name property if provided by AI
    try {
        const pkgJson = JSON.parse(files['/package.json'].code);
        if (!pkgJson.name) {
            pkgJson.name = "sakai-builder-app-ai";
            files['/package.json'].code = JSON.stringify(pkgJson, null, 2);
        }
         if (!pkgJson.scripts || !pkgJson.scripts.dev) {
            pkgJson.scripts = { ...pkgJson.scripts, dev: "vite" };
            files['/package.json'].code = JSON.stringify(pkgJson, null, 2);
        }
    } catch (e) {
        console.warn("AI provided package.json is not valid JSON, using default scripts if needed.");
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
      hidden: true,
    };
  }
  
  // Ensure src/main.tsx entry point
   if (!files['/src/main.tsx']) {
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
  if (!files['/src/App.tsx'] && files['/src/main.tsx']?.code.includes("import App from './App.tsx'")) {
      files['/src/App.tsx'] = {
        code: `
function App() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 p-4">
      <h1 className="text-3xl font-bold text-blue-600 mb-4">
        Sakai Builder - AI Generated App
      </h1>
      <p className="text-slate-700">
        Edit <code className="bg-slate-200 p-1 rounded">src/App.tsx</code> and save to test HMR.
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
  }


  return files;
};


export default function SakaiBuilderPage() {
  const [prompt, setPrompt] = useState<string>("Crée une application simple de compteur en React avec Tailwind CSS. Elle doit avoir un bouton pour incrémenter, un pour décrémenter, et afficher le compte actuel.");
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
      } else if (result.files) {
        const sandpackReadyFiles = ensureEssentialFiles(result.files);
        setGeneratedFiles(sandpackReadyFiles);
      } else {
        setError("L'IA n'a retourné aucun fichier. Veuillez réessayer ou modifier votre prompt.");
      }
    } catch (e: any) {
      console.error("Error calling generateProjectFiles:", e);
      setError(e.message || "Une erreur inattendue est survenue lors de la génération du projet.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const initialSandpackFiles = ensureEssentialFiles({
    '/src/App.tsx': `
function App() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-10">
      <header className="mb-8 text-center">
        <h1 className="text-5xl font-bold text-teal-400 animate-pulse">Sakai Builder</h1>
        <p className="text-xl text-gray-400 mt-2">
          Entrez une description de l'application que vous souhaitez construire dans le volet de gauche.
        </p>
      </header>
      <div className="bg-gray-800 p-6 rounded-xl shadow-2xl">
        <p className="text-lg">
          Par exemple: <em className="text-teal-300">&ldquo;Crée une app de todo list simple en React avec Tailwind CSS.&rdquo;</em>
        </p>
      </div>
       <footer className="mt-12 text-center text-gray-500 text-sm">
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
      <header className="p-4 border-b bg-card flex items-center justify-between shrink-0">
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

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-px bg-border overflow-hidden">
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
                        <div className="mt-4 flex items-center justify-center text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin mr-2" />
                            Génération du projet en cours... veuillez patienter.
                        </div>
                    )}
                    {error && (
                        <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-md flex items-start gap-2">
                            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold">Erreur de génération</p>
                                <p className="text-xs">{error}</p>
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
