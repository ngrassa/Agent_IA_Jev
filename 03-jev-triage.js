// 03-jev-triage.js : plusieurs questions de types différents sur un même état.
import { evaluate, JEV_MODEL } from './lib/models.js';

const ticket = {
  subject: 'Synchronisation Stripe en panne',
  message:
    'Ma connexion Stripe est coupée depuis trois jours et je perds des ventes. ' +
    'Remboursez-moi ce mois.',
  plan: 'pro',
};

const result = await evaluate({
  model: JEV_MODEL,
  state: ticket,
  questions: {
    department: {
      type: 'choice',
      instructions: 'Quelle équipe doit traiter ce ticket ?',
      criteria: {
        billing: 'Paiements, factures et remboursements',
        technical: 'Bugs, pannes et problèmes d’intégration',
        account: 'Connexion, droits et profil',
        spam: 'Publicité ou message sans rapport avec le service',
      },
    },
    severity: {
      type: 'score',
      instructions: 'Quelle est la gravité du problème pour le client ?',
      criteria: [
        'Cosmétique ou informatif',
        'Dégradé, mais un contournement existe',
        'Bloquant, sans contournement',
        'Bloquant avec perte financière ou perte de données',
      ],
    },
    angry: { type: 'boolean', instructions: 'Le client est en colère.' },
    requestsRefund: {
      type: 'boolean',
      instructions: 'Le client demande-t-il un remboursement ?',
    },
  },
});

console.log('--- answers ---');
console.log(JSON.stringify(result.answers, null, 2));
console.log('--- confidence (choice et score uniquement) ---');
console.log(result.providerMetadata?.typesafe?.confidence);
