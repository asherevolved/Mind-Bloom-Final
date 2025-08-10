import {genkit} from 'genkit';

// We will use the Google AI plugin for features that Groq doesn't support, like text-to-speech.
const plugins = [];

export const ai = genkit({
  plugins,
});
