
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
import { Loader2, CodeXml } from 'lucide-react'; // Using CodeXml as placeholder icon

interface CodePreviewProps {
  files: SandpackFiles | null;
}

const lightTheme: SandpackThemeProp = {
  colors: {
    surface1: "#ffffff", 
    surface2: "#f8f9fa", 
    surface3: "#e9ecef", 
    clickable: "#495057", 
    base: "#343a40", 
    disabled: "#adb5bd",
    error: "#e03131",
    warning: "#fcc419",
    accent: "hsl(var(--primary))", 
  },
  syntax: {
    plain: "#343a40", 
    comment: { color: "#868e96", fontStyle: "italic" },
    keyword: "hsl(var(--primary))", 
    tag: "#228be6", 
    punctuation: "#495057",
    definition: "#1c7ed6",
    property: "#e67700", 
    static: "#5f3dc4", 
    string: "#40c057", 
  },
  font: {
    body: 'var(--font-geist-sans), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
    mono: 'var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
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
    error: "#e03131", 
    warning: "#fcc419", 
    accent: "hsl(var(--primary))", 
  },
  syntax: {
    plain: "hsl(var(--foreground))",
    comment: { color: "hsl(var(--muted-foreground))", fontStyle: "italic" },
    keyword: "hsl(var(--primary))", 
    tag: "#74c0fc", 
    punctuation: "hsl(var(--foreground))",
    definition: "#a5d8ff", 
    property: "#ffc078", 
    static: "#da77f2", 
    string: "#69db7c", 
  },
   font: {
    body: 'var(--font-geist-sans), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
    mono: 'var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    size: "13px",
    lineHeight: "20px",
  },
};


export function CodePreview({ files }: CodePreviewProps) {
  const { theme: activeTheme } = useTheme();
  const sandpackKey = useMemo(() => {
    if (!files) return 'initial-sandpack-preview';
    // Key off the stringified file names to ensure re-initialization if files change
    return `sandpack-${Object.keys(files).sort().join('-')}-${Date.now()}`;
  }, [files]);

  const [isSandpackLoading, setIsSandpackLoading] = useState(true);

  useEffect(() => {
    if (files) {
      setIsSandpackLoading(true); 
      const timer = setTimeout(() => {
        setIsSandpackLoading(false);
      }, 3000); 
      return () => clearTimeout(timer);
    } else {
      setIsSandpackLoading(false);
    }
  }, [files, sandpackKey]);

  if (!files) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-muted/20 p-6 text-center text-muted-foreground">
         <CodeXml className="h-20 w-20 text-primary/50 mb-6 opacity-50" />
        <p className="text-lg font-medium">Aperçu du projet</p>
        <p className="text-sm">Le rendu live de l'application générée par Sakai apparaîtra ici.</p>
      </div>
    );
  }
  
  // Vite template infers entry from index.html usually
  // Active file is less critical if the editor is hidden, but good to have a sensible default
  const activeFile = files['/src/App.tsx']?.active 
    ? '/src/App.tsx' 
    : (Object.keys(files).find(f => f.endsWith('.tsx') && !files[f].hidden && (files[f].code?.length || 0) > 0) || '/src/main.tsx');


  return (
    <div className="relative h-full w-full">
      {isSandpackLoading && files && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center text-foreground">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
            <p className="font-semibold">Préparation de l'aperçu...</p>
            <p className="text-xs text-muted-foreground">Cela peut prendre quelques instants.</p>
          </div>
        </div>
      )}
      <SandpackProvider
        key={sandpackKey}
        template="vite" // Vite template is crucial
        files={files}
        theme={activeTheme === 'dark' ? darkTheme : lightTheme}
        options={{
          showConsole: true, // Good for debugging the generated app
          showConsoleButton: true,
          showTabs: false, // Hiding tabs as editor is hidden
          showLineNumbers: false, // Hiding as editor is hidden
          showNavigator: false, // Hide file navigator
          editorHeight: '0px', // Attempt to hide editor by setting height to 0
          editorWidthPercentage: 0, // Attempt to hide editor
          activeFile: activeFile, // Set an active file
          bundlerURL: "https://sandpack-bundler.codesandbox.io", // Default bundler
          // entry: "/index.html", // Vite usually infers this
        }}
      >
        <SandpackLayout className="h-full w-full" style={{'--sp-layout-height': '100%'} as React.CSSProperties }>
          {/* SandpackCodeEditor is intentionally omitted to hide the code editor */}
          <SandpackPreview
              showSandpackErrorOverlay // Show errors from the sandboxed app
              showOpenInCodeSandbox={false} // Don't show "Open in CodeSandbox"
              style={{ height: '100%', width: '100%', flexGrow: 1, flexShrink: 0, flexBasis: 'auto' }} // Ensure preview takes full space
          />
        </SandpackLayout>
      </SandpackProvider>
    </div>
  );
}


    