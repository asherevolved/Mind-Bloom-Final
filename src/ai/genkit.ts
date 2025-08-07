import {genkit, Plugin} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const plugins: Plugin[] = [googleAI()];

export const ai = genkit({
  plugins,
});
