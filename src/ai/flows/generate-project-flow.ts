
'use server';
/**
 * @fileOverview Flow to generate project files based on a user prompt.
 *
 * - generateProjectFiles - Function to generate project files.
 * - GenerateProjectInput - Input type for the flow.
 * - GenerateProjectOutput - Output type for the flow (object of filenames and content).
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateProjectInputSchema = z.object({
  userInputPrompt: z.string().describe('The user_s textual prompt describing the project to generate.'),
});
export type GenerateProjectInput = z.infer<typeof GenerateProjectInputSchema>;

// This will be a record of filePath: fileContent
const ProjectFilesSchema = z.record(z.string()).describe(
  'An object where keys are full file paths (e.g., "/src/App.tsx") and values are the corresponding file content as strings.'
);
export type ProjectFiles = z.infer<typeof ProjectFilesSchema>;

const GenerateProjectOutputSchema = z.object({
  files: ProjectFilesSchema.optional(),
  error: z.string().optional(),
});
export type GenerateProjectOutput = z.infer<typeof GenerateProjectOutputSchema>;

export async function generateProjectFiles(input: GenerateProjectInput): Promise<GenerateProjectOutput> {
  return generateProjectFlow(input);
}

const projectGenerationPrompt = ai.definePrompt({
  name: 'generateProjectPrompt',
  input: { schema: GenerateProjectInputSchema },
  output: { 
    schema: z.object({ 
      projectFilesJson: z.string().describe(
        "A JSON string representing an object where keys are full file paths (e.g., '/src/App.tsx', '/package.json') and values are the file content. " +
        "Ensure all necessary configuration files are included for a runnable Vite + React TS + Tailwind project, including: " +
        "package.json (with react, react-dom, vite, @vitejs/plugin-react, typescript, tailwindcss, postcss, autoprefixer, and dev/build scripts), " +
        "vite.config.ts, tailwind.config.js, postcss.config.js, index.html (root), src/main.tsx (React entry point), src/index.css (Tailwind directives), and src/App.tsx."
      ) 
    }) 
  },
  system: `You are an expert React project generator. Based on the user's prompt, generate a complete set of files for a simple React TypeScript project using Vite as the build tool and Tailwind CSS for styling.
The output MUST be a single JSON string. This JSON string should represent an object where:
- Keys are the full file paths starting with a forward slash (e.g., '/src/App.tsx', '/package.json', '/tailwind.config.js', '/vite.config.ts', '/index.html', '/src/main.tsx', '/src/index.css', '/postcss.config.js').
- Values are the string content of these files.

Ensure the generated project is runnable. Include:
1.  package.json with react, react-dom, vite, @vitejs/plugin-react, typescript, tailwindcss, postcss, autoprefixer as dependencies/devDependencies. Include basic scripts like "dev": "vite", "build": "vite build".
2.  vite.config.ts configured for React and TypeScript (import react from '@vitejs/plugin-react'; export default { plugins: [react()] };).
3.  tailwind.config.js with basic setup (e.g., content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"], theme: { extend: {} }, plugins: []).
4.  postcss.config.js with tailwindcss and autoprefixer plugins (module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };).
5.  index.html at the root, as the entry point for Vite, with a <div id="root"></div> and <script type="module" src="/src/main.tsx"></script>.
6.  src/main.tsx as the React entry point, importing React, ReactDOM, App, and the main CSS file (e.g. './index.css'). It should render <App /> into the root div.
7.  src/index.css (or similar name, referenced in src/main.tsx) importing Tailwind directives (@tailwind base; @tailwind components; @tailwind utilities;).
8.  A basic src/App.tsx component that starts to implement the user's request.
9.  Any other components or files needed to fulfill the user's prompt, structured appropriately (e.g., in a src/components directory).

The project should be as simple as possible while being functional and demonstrating the core request.
All file paths must start with a '/'.
`,
  prompt: `User's project request: {{{userInputPrompt}}}`,
  config: {
    temperature: 0.3, // Lower temperature for more predictable, structured output
    safetySettings: [ // Relax safety settings slightly if it blocks valid code often
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ]
  }
});

const generateProjectFlow = ai.defineFlow(
  {
    name: 'generateProjectFlow',
    inputSchema: GenerateProjectInputSchema,
    outputSchema: GenerateProjectOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await projectGenerationPrompt(input);
      if (output?.projectFilesJson) {
        try {
          const filesObject = JSON.parse(output.projectFilesJson);
          // Validate if filesObject is a record of strings
                          if (typeof filesObject === 'object' && filesObject !== null && 
                              Object.values(filesObject).every(value => typeof value === 'string')) {
            return { files: filesObject as ProjectFiles };
          } else {
            console.error('Parsed JSON is not in the expected ProjectFiles format:', filesObject);
            return { error: 'AI returned data in an unexpected format. Parsed JSON is not a record of strings.' };
          }
        } catch (parseError: any) {
          console.error('Failed to parse JSON output from AI:', parseError, "\nAI Output was:\n", output.projectFilesJson);
          return { error: `Failed to parse AI's response as JSON. Error: ${parseError.message}` };
        }
      } else {
        return { error: "AI did not return the expected projectFilesJson output." };
      }
    } catch (e: any) {
      console.error('Error in generateProjectFlow:', e);
      return { error: e.message || 'An unexpected error occurred during project generation.' };
    }
  }
);
