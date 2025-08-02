import { config } from 'dotenv';
config();

import '@/ai/flows/therapist-chat.ts';
import '@/ai/flows/task-suggestions.ts';
import '@/ai/flows/session-analysis.ts';