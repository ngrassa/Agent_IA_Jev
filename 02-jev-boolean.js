// 02-jev-boolean.js : première question posée à Jev (une seule question booléenne).
import { evaluate, JEV_MODEL } from './lib/models.js';

const result = await evaluate({
  model: JEV_MODEL,
  state: 'L’agent du support a remboursé intégralement le client.',
  questions: {
    refunded: {
      type: 'boolean',
      instructions: 'Un remboursement a-t-il été effectué ?',
    },
  },
});

console.log(JSON.stringify(result.answers, null, 2));
console.log('Probabilité :', result.answers.refunded.probability);
