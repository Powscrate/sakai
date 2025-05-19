
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
import { useEffect, useState } from 'react';

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
  const [sandpackKey, setSandpackKey] = useState(0); // Key to force re-render

  useEffect(() => {
    // Increment key whenever files change to force Sandpack to re-initialize
    if (files) {
      setSandpackKey(prevKey => prevKey + 1);
    }
  }, [files]);

  if (!files) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/30 p-4 text-center text-muted-foreground">
        <p>L'aperçu du code apparaîtra ici une fois le projet généré.</p>
      </div>
    );
  }
  
  // Determine the entry point. Sandpack usually needs an `index.html` for Vite.
  // The default react-ts template might assume /src/index.tsx or /src/main.tsx via /index.html
  // If a package.json specifies a 'main' or 'module', or if index.html points to an entry.
  // For Vite, it's usually index.html at the root.
  const entryFilePath = files['/index.html'] ? '/index.html' : undefined;


  return (
    <SandpackProvider
      key={sandpackKey} // Force re-mount when files change
      template="vite" // Use Vite template
      files={files}
      theme={activeTheme === 'dark' ? darkTheme : lightTheme}
      options={{
        showConsole: true,
        showConsoleButton: true,
        showTabs: true,
        showLineNumbers: true,
        closableTabs: true,
        visibleFiles: Object.keys(files).filter(f => !files[f].hidden && !f.endsWith('config.js') && !f.endsWith('json') && f !== '/index.html' && !f.endsWith('.css')),
        activeFile: files['/src/App.tsx'] ? '/src/App.tsx' : (Object.keys(files).find(f => f.endsWith('.tsx') && !files[f].hidden) || '/src/main.tsx'),
        bundlerURL: "https://sandpack-bundler.codesandbox.io", // Default, ensure it's accessible
        // entry: entryFilePath, // Vite template usually infers from index.html
        // customSetup: { // Vite template usually handles this if package.json is correct
        //   dependencies: {
        //     "react": "latest",
        //     "react-dom": "latest",
        //     "tailwindcss": "latest", 
        //      // Vite should be listed in package.json devDependencies
        //   },
        // },
      }}
      
    >
      <SandpackLayout className="h-full w-full">
        <SandpackCodeEditor 
            showTabs 
            showLineNumbers 
            showInlineErrors
            wrapContent 
            style={{ height: '100%', flexGrow: 1, flexShrink: 1, minHeight: 0 }}
        />
        <SandpackPreview 
            showSandpackErrorOverlay 
            showOpenInCodeSandbox={false}
            style={{ height: '100%', flexGrow: 1, flexShrink: 1, minHeight: 0 }}
        />
      </SandpackLayout>
    </SandpackProvider>
  );
}

