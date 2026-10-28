// lib/guard.js : Jev relit la réponse écrite par le LLM avant l’envoi (garde-fou).
import { evaluate, JEV_MODEL } from './models.js';

export async function guardReply(ticket, reply) {
  const result = await evaluate({
    model: JEV_MODEL,
    state: { ticketDuClient: ticket.message, reponseProposee: reply },
    questions: {
      promisesRefund: {
        type: 'boolean',
        instructions:
          'La réponse promet ou confirme un remboursement ou un geste commercial.',
      },
      professional: {
        type: 'boolean',
        instructions: 'La réponse est polie, claire et professionnelle.',
      },
    },
  });

  const { promisesRefund, professional } = result.answers;
  const blocked = promisesRefund.probability >= 0.5 || professional.probability < 0.5;
  return {
    blocked,
    promisesRefund: promisesRefund.probability,
    professional: professional.probability,
  };
}
