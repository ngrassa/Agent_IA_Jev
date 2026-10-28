// 01-mistral.js : test de la clé et de la passerelle avec le LLM seul (Mistral).
import { generateText, LLM_MODEL } from './lib/models.js';
// (generateText est réexporté par lib/models.js pour garder des imports courts)

const { text, usage } = await generateText({
  model: LLM_MODEL,
  prompt: 'Explique en deux phrases ce qu’est un agent IA.',
});

console.log(`Modèle : ${LLM_MODEL}`);
console.log(text);
console.log('Usage :', usage);
