
"use client";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  type SandpackFiles,
  type SandpackThemeProp,
} from '@codesandbox/sandpack-react';
import { useTheme } from 'next-themes';
import { useEffect, useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';

interface CodePreviewProps {
  files: SandpackFiles | null;
}

const lightTheme: SandpackThemeProp = {
  colors: {
    surface1: "#ffffff", // editor background
    surface2: "#f8f9fa", // tabs background
    surface3: "#e9ecef", // hover states
    clickable: "#495057", // text in editor
    base: "#343a40", // regular text
    disabled: "#adb5bd",
    error: "#e03131",
    warning: "#fcc419",
    accent: "hsl(var(--primary))", // primary color (e.g. teal)
  },
  syntax: {
    plain: "#343a40", // default text
    comment: { color: "#868e96", fontStyle: "italic" },
    keyword: "hsl(var(--primary))", // teal for keywords
    tag: "#228be6", // blue for tags
    punctuation: "#495057",
    definition: "#1c7ed6",
    property: "#e67700", // orange for props
    static: "#5f3dc4", // purple for static
    string: "#40c057", // green for strings
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
    surface1: "hsl(var(--popover))", // hsl(205 35% 18%) dark card background
    surface2: "hsl(var(--background))", // hsl(205 40% 12%) darker editor tab background
    surface3: "hsl(var(--muted))", // hsl(205 30% 25%) hover states
    clickable: "hsl(var(--foreground))", // hsl(190 20% 90%) text in editor
    base: "hsl(var(--card-foreground))", // hsl(190 20% 90%) regular text
    disabled: "hsl(var(--muted-foreground))", // hsl(190 20% 65%)
    error: "#e03131", // Consistent error red
    warning: "#fcc419", // Consistent warning yellow
    accent: "hsl(var(--primary))", // hsl(175 60% 55%) primary teal for dark mode
  },
  syntax: {
    plain: "hsl(var(--foreground))",
    comment: { color: "hsl(var(--muted-foreground))", fontStyle: "italic" },
    keyword: "hsl(var(--primary))", // primary teal for keywords
    tag: "#74c0fc", // Lighter blue for tags
    punctuation: "hsl(var(--foreground))",
    definition: "#a5d8ff", // Lighter blue for definitions
    property: "#ffc078", // Lighter orange for props
    static: "#da77f2", // Lighter purple for static
    string: "#69db7c", // Lighter green for strings
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
  // Key to force re-render SandpackProvider when files change.
  // Using JSON.stringify of file keys as part of the key can help ensure re-initialization
  // if the file structure changes significantly, not just content.
  const sandpackKey = useMemo(() => {
    if (!files) return 'initial';
    return `sandpack-${Object.keys(files).sort().join('-')}`;
  }, [files]);

  const [isSandpackLoading, setIsSandpackLoading] = useState(true);

  useEffect(() => {
    if (files) {
      setIsSandpackLoading(true); // Set loading to true when new files are provided
      // Sandpack doesn't have a direct "onReady" or "onLoadFinished" event for the whole environment.
      // We can use a timeout as a proxy for when the initial setup might be done.
      // This is not foolproof but can help manage a loading indicator.
      const timer = setTimeout(() => {
        setIsSandpackLoading(false);
      }, 3000); // Adjust timeout as needed, 3s is a guess
      return () => clearTimeout(timer);
    } else {
      setIsSandpackLoading(false);
    }
  }, [files, sandpackKey]); // Depend on sandpackKey too

  if (!files) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-muted/20 p-6 text-center text-muted-foreground">
         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="currentColor" className="h-20 w-20 text-primary/50 mb-6 opacity-50">
            <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="5" fill="none" />
            <circle cx="50" cy="50" r="15" fill="currentColor" />
            <path d="M50 30 A20 20 0 0 1 50 70 A20 20 0 0 1 50 30 M50 40 A10 10 0 0 0 50 60 A10 10 0 0 0 50 40" fill="hsl(var(--muted))" />
          </svg>
        <p className="text-lg font-medium">Aperçu du projet et de l'éditeur de code</p>
        <p className="text-sm">Le code généré par Sakai apparaîtra ici une fois que vous aurez soumis une description.</p>
      </div>
    );
  }
  
  const entryFilePath = files['/index.html'] ? '/index.html' : undefined;
  const activeFile = files['/src/App.tsx']?.active 
    ? '/src/App.tsx' 
    : (Object.keys(files).find(f => f.endsWith('.tsx') && !files[f].hidden && files[f].code.length > 0) || '/src/main.tsx');


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
        template="vite"
        files={files}
        theme={activeTheme === 'dark' ? darkTheme : lightTheme}
        options={{
          showConsole: true,
          showConsoleButton: true,
          showTabs: true,
          showLineNumbers: true,
          closableTabs: true,
          // Attempt to show most relevant files, exclude configs from tabs initially
          visibleFiles: Object.keys(files).filter(f => 
            !files[f].hidden && 
            (f.startsWith('/src/') || f === '/index.html' || f === '/package.json') &&
            !f.endsWith('config.js') && 
            !f.endsWith('postcss.config.js') &&
            !f.endsWith('vite.config.ts') &&
            !f.endsWith('.css')
          ).slice(0, 5), // Limit initial tabs for clarity
          activeFile: activeFile,
          bundlerURL: "https://sandpack-bundler.codesandbox.io",
          // entry: entryFilePath, // Vite template usually infers from index.html
          // editorHeight: '100%', // Let flexbox control height distribution
          // editorWidthPercentage: 40, // Make editor take 40% of width
        }}
      >
        <SandpackLayout className="h-full w-full">
          <SandpackCodeEditor
              showTabs
              showLineNumbers
              showInlineErrors
              wrapContent
              style={{ height: '100%', flexGrow: 2, flexShrink: 1, minHeight: 0, flexBasis: '40%' }} // Editor takes less space
          />
          <SandpackPreview
              showSandpackErrorOverlay
              showOpenInCodeSandbox={false}
              style={{ height: '100%', flexGrow: 3, flexShrink: 1, minHeight: 0, flexBasis: '60%' }} // Preview takes more space
          />
        </SandpackLayout>
      </SandpackProvider>
    </div>
  );
}
