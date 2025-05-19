
"use client";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackPreview,
  type SandpackFiles,
  type SandpackThemeProp,
} from '@codesandbox/sandpack-react';
import { useTheme } from 'next-themes';
import { useEffect, useState, useMemo } from 'react';
import { Loader2, Eye, ServerCrash } from 'lucide-react'; // Using Eye as placeholder for preview

interface CodePreviewProps {
  files: SandpackFiles | null;
  isLoading?: boolean; // To show a loader specifically when files are null due to loading
}

// Consistent themes with chat-assistant
const lightTheme: SandpackThemeProp = {
  colors: {
    surface1: "hsl(var(--card))", 
    surface2: "hsl(var(--background))", 
    surface3: "hsl(var(--muted))", 
    clickable: "hsl(var(--foreground))",
    base: "hsl(var(--foreground))",
    disabled: "hsl(var(--muted-foreground))",
    error: "hsl(var(--destructive))",
    warning: "#fcc419", 
    accent: "hsl(var(--primary))",
  },
  syntax: {
    plain: "hsl(var(--foreground))",
    comment: { color: "hsl(var(--muted-foreground))", fontStyle: "italic" },
    keyword: "hsl(var(--primary))",
    tag: "hsl(var(--accent))", 
    punctuation: "hsl(var(--foreground))",
    definition: "hsl(var(--primary))",
    property: "#e67700", 
    static: "#5f3dc4",
    string: "#40c057",
  },
  font: {
    body: 'var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif',
    mono: 'var(--font-geist-sans), ui-monospace, monospace', // Use sans for mono as well for consistency if geist-mono is not loaded
    size: "13px",
    lineHeight: "20px",
  },
};

const darkTheme: SandpackThemeProp = {
  colors: {
    surface1: "hsl(var(--popover))", 
    surface2: "hsl(var(--background))",
    surface3: "hsl(var(--muted))",
    clickable: "hsl(var(--foreground))",
    base: "hsl(var(--card-foreground))",
    disabled: "hsl(var(--muted-foreground))",
    error: "hsl(var(--destructive))",
    warning: "#fcc419",
    accent: "hsl(var(--primary))",
  },
  syntax: {
    plain: "hsl(var(--foreground))",
    comment: { color: "hsl(var(--muted-foreground))", fontStyle: "italic" },
    keyword: "hsl(var(--primary))",
    tag: "hsl(var(--accent))",
    punctuation: "hsl(var(--foreground))",
    definition: "hsl(var(--primary))",
    property: "#ffc078",
    static: "#da77f2",
    string: "#69db7c",
  },
  font: {
    body: 'var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif',
    mono: 'var(--font-geist-sans), ui-monospace, monospace',
    size: "13px",
    lineHeight: "20px",
  },
};


export function CodePreview({ files, isLoading }: CodePreviewProps) {
  const { theme: activeTheme } = useTheme();
  
  // Key for SandpackProvider to force re-initialization when files change structure
  const sandpackKey = useMemo(() => {
    if (!files) return 'initial-sandpack-preview-loading';
    return `sandpack-preview-${Object.keys(files).sort().join('-')}-${Date.now()}`;
  }, [files]);

  const [isInternalSandpackLoading, setIsInternalSandpackLoading] = useState(true);

  useEffect(() => {
    setIsInternalSandpackLoading(true); 
    const timer = setTimeout(() => {
      setIsInternalSandpackLoading(false);
    }, 2500); // Generic timer, Sandpack's own loading is internal
    return () => clearTimeout(timer);
  }, [sandpackKey]); // Re-run when key (and thus files) change

  if (isLoading || !files) { // Show loader if files are null due to parent loading OR explicitly told so
    return (
      <div className="flex flex-col items-center justify-center h-full bg-muted/20 p-6 text-center text-muted-foreground">
         <Loader2 className="h-20 w-20 text-primary/70 mb-6 animate-spin" />
        <p className="text-lg font-medium">Préparation de l'aperçu...</p>
        <p className="text-sm">Sakai construit votre application.</p>
      </div>
    );
  }
  
  // Determine entry file. Sandpack's Vite template primarily uses index.html.
  const entryFile = '/index.html'; 
  // activeFile determines what's shown in editor (if editor was visible)
  const activeFile = files['/src/App.tsx'] ? '/src/App.tsx' : (files['/src/main.tsx'] ? '/src/main.tsx' : entryFile);


  return (
    <div className="relative h-full w-full bg-background">
      {isInternalSandpackLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center text-foreground p-4 rounded-lg bg-card shadow-xl">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
            <p className="font-semibold">Initialisation de Sandpack...</p>
            <p className="text-xs text-muted-foreground">Cela peut prendre un moment.</p>
          </div>
        </div>
      )}
      <SandpackProvider
        key={sandpackKey}
        template="vite"
        files={files}
        theme={activeTheme === 'dark' ? darkTheme : lightTheme}
        options={{
          activeFile: activeFile, // For editor context if it were visible
          entry: entryFile, // Vite template primarily uses index.html as entry
          showConsole: true,
          showConsoleButton: true,
          showTabs: false,
          showLineNumbers: false,
          showNavigator: false,
          editorHeight: '0px', // Hide editor by setting height to 0
          editorWidthPercentage: 0, // Hide editor
          bundlerURL: "https://sandpack-bundler.codesandbox.io",
          // Default external resources for Vite template (React, ReactDOM) are usually sufficient
          // For Tailwind, package.json must list it, and Sandpack's Vite bundler will handle it
        }}
        
      >
        <SandpackLayout 
            className="h-full w-full !bg-transparent"
            style={{'--sp-layout-height': '100%'} as React.CSSProperties }
        >
          {/* SandpackCodeEditor is intentionally omitted to hide the code editor */}
          <SandpackPreview
              showSandpackErrorOverlay // Show errors from the sandboxed app
              showOpenInCodeSandbox={false}
              className="h-full w-full" // Ensure preview itself takes full space
              style={{ 
                height: '100%', 
                width: '100%', 
                flexGrow: 1, 
                border: 'none',
              }}
          />
        </SandpackLayout>
      </SandpackProvider>
       {/* Fallback/Error message if Sandpack fails to render - basic */}
       { !isInternalSandpackLoading && (
        <div 
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          // This is tricky; if Sandpack renders its own error, this might be hidden.
          // Consider a more robust way to detect Sandpack internal errors if needed.
        > 
          {/* This is a placeholder. Actual Sandpack errors are shown by showSandpackErrorOverlay */}
        </div>
      )}
    </div>
  );
}

    