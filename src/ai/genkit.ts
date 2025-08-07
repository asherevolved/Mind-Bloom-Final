import {genkit, Plugin} from 'genkit';
import {groq} from 'genkitx-groq';

const plugins: Plugin[] = [];

if (process.env.GROQ_API_KEY) {
  plugins.push(groq({apiKey: process.env.GROQ_API_KEY}));
}

export const ai = genkit({
  plugins,
});
