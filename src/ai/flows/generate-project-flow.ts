
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
        "CRITICAL FOR VALID JSON: All string values within this JSON, especially file contents, MUST be properly escaped. " +
        "Specifically, newlines (\\n) MUST be represented as \\\\n, backslashes (\\) as \\\\\\\\, and double quotes (\") within string literals as \\\\\". " + // Double escaped for the prompt string literal itself
        "Ensure all necessary configuration files are included for a runnable Vite + React TS + Tailwind project. " +
        "The project MUST include: " +
        "1. '/package.json': with a unique 'name' property (e.g., 'sakai-generated-app'), " +
        "   'dependencies': { 'react': '^18.2.0', 'react-dom': '^18.2.0', 'lucide-react': '^0.400.0' (use latest minor) }, " + // Added lucide-react
        "   'devDependencies': { '@vitejs/plugin-react': '^4.0.3', 'vite': '^4.4.5', 'typescript': '^5.0.2', 'tailwindcss': '^3.3.3', 'postcss': '^8.4.27', 'autoprefixer': '^10.4.14' }, " +
        "   and 'scripts': { 'dev': 'vite', 'build': 'vite build' }. Make sure 'vite' is a devDependency. " +
        "2. '/vite.config.ts': configured for React and TypeScript (e.g., import react from '@vitejs/plugin-react'; import { defineConfig } from 'vite'; export default defineConfig({ plugins: [react()] });). " +
        "3. '/tailwind.config.js': with content array including './index.html' and './src/**/*.{js,ts,jsx,tsx}'. " +
        "   (e.g., export default { content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'], theme: { extend: {} }, plugins: [] };). " +
        "4. '/postcss.config.js': with tailwindcss and autoprefixer plugins (e.g., export default { plugins: { tailwindcss: {}, autoprefixer: {} } };). " +
        "5. '/index.html': at the root, as the entry point for Vite, with a <div id=\"root\"></div> and <script type=\"module\" src=\"/src/main.tsx\"></script>. " +
        "6. '/src/main.tsx': as the React entry point, importing React, ReactDOM, App, and the main CSS file (e.g. './index.css'). It should render <App /> into the root div. " +
        "7. '/src/index.css': (or similar name, referenced in src/main.tsx) importing Tailwind directives (@tailwind base; @tailwind components; @tailwind utilities;). " +
        "8. A basic '/src/App.tsx' component that starts to implement the user's request (using Tailwind for styling and lucide-react for icons if appropriate) and is runnable. " +
        "All file paths MUST start with a '/'. Do NOT include any comments or explanations outside of the JSON string itself. The entire response MUST BE ONLY the JSON string."
      )
    })
  },
  system: `You are an expert React project generator. Based on the user's prompt, generate a complete set of files for a simple React TypeScript project using Vite as the build tool, Tailwind CSS for styling, and Lucide React for icons.
The output MUST be a single, valid JSON string. This JSON string should represent an object where:
- Keys are the full file paths starting with a forward slash (e.g., '/src/App.tsx', '/package.json').
- Values are the string content of these files.

CRITICAL FOR VALID JSON: Within the file content strings, all special characters MUST be escaped. Newlines should be \\\\n, double quotes should be \\\\", and backslashes should be \\\\\\\\.

Ensure the generated project is runnable. Include all specified files:
1.  '/package.json' (unique "name", specified dependencies including 'lucide-react', devDependencies, and scripts 'dev', 'build').
2.  '/vite.config.ts' (React plugin).
3.  '/tailwind.config.js' (content array correctly configured).
4.  '/postcss.config.js' (tailwindcss, autoprefixer).
5.  '/index.html' (root div, script tag for /src/main.tsx).
6.  '/src/main.tsx' (imports React, ReactDOM, App, CSS; renders App).
7.  '/src/index.css' (Tailwind directives).
8.  '/src/App.tsx' implementing the user's request, using Tailwind and Lucide icons.
9.  Any other components or files needed, structured appropriately (e.g., in a src/components directory).

The project should be as simple as possible while being functional. All file paths must start with a '/'.
Do NOT include any comments or explanations outside of the JSON string itself. The entire response must be ONLY the JSON string. Adhere strictly to the specified JSON string escaping rules.
`,
  prompt: `User's project request: {{{userInputPrompt}}}`,
  config: {
    temperature: 0.1, // Lower temperature for more predictable, structured output
    safetySettings: [
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
          // Attempt to parse the JSON. If it fails, the catch block below will handle it.
          const filesObject = JSON.parse(output.projectFilesJson);
          
          // Validate if filesObject is a record of strings with valid paths
          if (typeof filesObject === 'object' && filesObject !== null &&
              Object.values(filesObject).every(value => typeof value === 'string') &&
              Object.keys(filesObject).every(key => typeof key === 'string' && key.startsWith('/'))) {
            return { files: filesObject as ProjectFiles };
          } else {
            console.error('AI returned data in an unexpected format. Parsed JSON is not a record of strings with valid paths starting with "/". Raw AI output was:\n', output.projectFilesJson);
            return { error: 'AI returned data in an unexpected format. Parsed JSON is not a record of strings with valid paths. Check server console for AI output.' };
          }
        } catch (parseError: any) {
          console.error('Failed to parse JSON output from AI. Raw AI output was:\n', output.projectFilesJson, '\nParse error details:', parseError, 'Message:', parseError.message, 'Stack:', parseError.stack);
          return { error: `Failed to parse AI's response as JSON. Error: ${parseError.message}. Check server console for AI output and JSON validity.` };
        }
      } else {
        console.error("AI did not return the expected projectFilesJson output. Full output object:", output);
        return { error: "AI did not return the expected 'projectFilesJson' output. The response might be empty or malformed. Check server console for AI output." };
      }
    } catch (e: any) {
      console.error('Error in generateProjectFlow:', e);
      return { error: e.message || 'An unexpected error occurred during project generation.' };
    }
  }
);

    

    