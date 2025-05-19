
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
import { Loader2, Eye } from 'lucide-react'; // Using Eye as placeholder for preview

interface CodePreviewProps {
  files: SandpackFiles | null;
}

// Consistent themes with chat-assistant
const lightTheme: SandpackThemeProp = {
  colors: {
    surface1: "hsl(var(--card))", // Use card for editor background for consistency
    surface2: "hsl(var(--background))", // Background for elements like tabs
    surface3: "hsl(var(--muted))", // Borders, inactive elements
    clickable: "hsl(var(--foreground))",
    base: "hsl(var(--foreground))",
    disabled: "hsl(var(--muted-foreground))",
    error: "hsl(var(--destructive))",
    warning: "#fcc419", // Keep warning distinct
    accent: "hsl(var(--primary))",
  },
  syntax: {
    plain: "hsl(var(--foreground))",
    comment: { color: "hsl(var(--muted-foreground))", fontStyle: "italic" },
    keyword: "hsl(var(--primary))",
    tag: "hsl(var(--accent))", // Use accent for tags
    punctuation: "hsl(var(--foreground))",
    definition: "hsl(var(--primary))",
    property: "#e67700", // Keep some distinct syntax colors
    static: "#5f3dc4",
    string: "#40c057",
  },
  font: {
    body: 'var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif',
    mono: 'var(--font-geist-mono), ui-monospace, monospace',
    size: "13px",
    lineHeight: "20px",
  },
};

const darkTheme: SandpackThemeProp = {
  colors: {
    surface1: "hsl(var(--popover))", // popover is often darker than card in dark themes
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
    mono: 'var(--font-geist-mono), ui-monospace, monospace',
    size: "13px",
    lineHeight: "20px",
  },
};


export function CodePreview({ files }: CodePreviewProps) {
  const { theme: activeTheme } = useTheme();
  
  const sandpackKey = useMemo(() => {
    if (!files) return 'initial-sandpack-preview';
    // Create a key based on file names and current time to force re-initialization
    return `sandpack-preview-${Object.keys(files).sort().join('-')}-${Date.now()}`;
  }, [files]);

  const [isSandpackLoading, setIsSandpackLoading] = useState(true);

  useEffect(() => {
    setIsSandpackLoading(true); 
    // Give Sandpack some time to initialize/re-initialize
    const timer = setTimeout(() => {
      setIsSandpackLoading(false);
    }, 2500); // Adjusted timing
    return () => clearTimeout(timer);
  }, [files, sandpackKey]); // Re-run when files or key change

  if (!files) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-muted/20 p-6 text-center text-muted-foreground">
         <Eye className="h-20 w-20 text-primary/50 mb-6 opacity-50" data-ai-hint="eye preview" />
        <p className="text-lg font-medium">Aperçu du Projet</p>
        <p className="text-sm">Le rendu live de l'application générée par Sakai apparaîtra ici.</p>
        <p className="text-xs mt-2">Générez un projet pour commencer.</p>
      </div>
    );
  }
  
  const entryFile = files['/index.html'] ? '/index.html' : (files['/src/main.tsx'] ? '/src/main.tsx' : '/src/App.tsx');

  return (
    <div className="relative h-full w-full bg-background">
      {isSandpackLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center text-foreground p-4 rounded-lg bg-card shadow-xl">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
            <p className="font-semibold">Préparation de l'aperçu...</p>
            <p className="text-xs text-muted-foreground">Cela peut prendre quelques instants.</p>
          </div>
        </div>
      )}
      <SandpackProvider
        key={sandpackKey} // Force re-mount when key changes
        template="vite"    // Use Vite template for better Tailwind & modern JS support
        files={files}
        theme={activeTheme === 'dark' ? darkTheme : lightTheme}
        options={{
          activeFile: entryFile, // Vite template usually infers from index.html
          showConsole: true,
          showConsoleButton: true,
          showTabs: false,          // Hide tabs as editor is hidden
          showLineNumbers: false,   // Hide as editor is hidden
          showNavigator: false,     // Hide file navigator
          editorHeight: '0px',      // Hide editor by setting height to 0
          editorWidthPercentage: 0, // Hide editor
          bundlerURL: "https://sandpack-bundler.codesandbox.io",
          // Ensure environment variables are available if needed (though less common for client-side only preview)
          // customSetup: {
          //   dependencies: files['/package.json'] ? JSON.parse(files['/package.json'].code).dependencies : {},
          //   devDependencies: files['/package.json'] ? JSON.parse(files['/package.json'].code).devDependencies : {},
          // }
        }}
      >
        <SandpackLayout 
            className="h-full w-full !bg-transparent" // Ensure layout itself is transparent if preview has own bg
            style={{'--sp-layout-height': '100%'} as React.CSSProperties }
        >
          {/* SandpackCodeEditor is intentionally omitted to hide the code editor */}
          <SandpackPreview
              showSandpackErrorOverlay // Show errors from the sandboxed app
              showOpenInCodeSandbox={false} // Don't show "Open in CodeSandbox"
              // The style below ensures the preview takes full available space
              style={{ 
                height: '100%', 
                width: '100%', 
                flexGrow: 1, 
                flexShrink: 1, // Allow shrinking if necessary
                flexBasis: '0%', // Take up all available space in flex container
                overflow: 'auto', // Add scroll if content overflows
                border: 'none', // Remove any default border
              }}
          />
        </SandpackLayout>
      </SandpackProvider>
    </div>
  );
}

    