import {genkit, Plugin} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// We will use the Google AI plugin for features that Groq doesn't support, like text-to-speech.
const plugins: Plugin[] = [googleAI()];

export const ai = genkit({
  plugins,
});
