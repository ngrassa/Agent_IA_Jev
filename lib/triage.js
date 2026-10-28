// lib/triage.js : Jev décide, le code applique des règles (seuils) sur ses réponses.
import { evaluate, JEV_MODEL } from './models.js';

// Seuils modifiables par variable d’environnement pour les expériences de la partie 4.
const MIN_CONFIDENCE = Number(process.env.MIN_CONFIDENCE ?? 0.6);
const MIN_PROBABILITY = Number(process.env.MIN_PROBABILITY ?? 0.7);

export async function triage(ticket) {
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

  const { department, severity, angry, requestsRefund } = result.answers;
  const confidence = result.providerMetadata?.typesafe?.confidence?.department ?? 0;
  const selected = department.probabilities?.[department.choice] ?? 0;

  const facts = {
    department: department.choice,
    departmentProbability: selected,
    departmentConfidence: confidence,
    severity: severity.score,
    angry: angry.probability >= 0.5,
    requestsRefund: requestsRefund.probability >= 0.5,
  };

  // Règle 1 : le spam est ignoré, sans aucun appel au LLM.
  if (department.choice === 'spam' && selected >= MIN_PROBABILITY) {
    return { action: 'ignore', ...facts };
  }
  // Règle 2 : en dessous des seuils, Jev « ne sait pas » : on ne devine pas.
  if (confidence < MIN_CONFIDENCE || selected < MIN_PROBABILITY) {
    return { action: 'human-review', reason: 'département ambigu', ...facts };
  }
  // Règle 3 : sinon le ticket est pris en charge par l’agent.
  return { action: 'assign', ...facts };
}
