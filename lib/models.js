// lib/models.js : un seul endroit pour choisir les modèles et importer l’AI SDK.
// Les deux modèles passent par la même passerelle (Vercel AI Gateway) et la même
// clé AI_GATEWAY_API_KEY, que le SDK lit tout seul dans l’environnement.
import { experimental_evaluate as evaluate, generateText, isStepCount, tool } from 'ai';

// Modèle de décision (System One) : renvoie des choix, des scores, des probabilités.
export const JEV_MODEL = process.env.JEV_MODEL || 'typesafe-ai/jev';

// Modèle de langage (LLM) : génère du texte et appelle des outils.
export const LLM_MODEL = process.env.LLM_MODEL || 'mistral/mistral-small';

export { evaluate, generateText, isStepCount, tool };
