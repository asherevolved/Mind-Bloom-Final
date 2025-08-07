import {genkit, Plugin} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {groq} from 'genkitx-groq';

const plugins: Plugin[] = [googleAI()];

if (process.env.GROQ_API_KEY) {
  plugins.push(groq({apiKey: process.env.GROQ_API_KEY}));
}

export const ai = genkit({
  plugins,
});