import {genkit, Plugin} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const plugins: Plugin[] = [googleAI()];

if (process.env.GROQ_API_KEY) {
  // Note: Groq plugin is not being used due to build issues.
  // The 'genkitx-groq' package has been removed.
}

export const ai = genkit({
  plugins,
});
