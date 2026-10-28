// lib/tools.js : outils que le LLM (Mistral) peut appeler. Données simulées.
import { tool } from './models.js';
import { z } from 'zod';

const ORDERS = {
  'CMD-1001': { status: 'livrée', total: '49,00 €', date: '2026-10-20' },
  'CMD-1002': { status: 'payée deux fois', total: '49,00 € x 2', date: '2026-10-22' },
  'CMD-1003': { status: 'en cours d’envoi', total: '19,90 €', date: '2026-10-26' },
};

export const tools = {
  getOrderStatus: tool({
    description: 'Retourne le statut d’une commande (identifiant du type CMD-1001).',
    inputSchema: z.object({
      orderId: z.string().describe('Identifiant de commande, ex. CMD-1234'),
    }),
    execute: async ({ orderId }) =>
      ORDERS[orderId] ?? { error: `Commande ${orderId} introuvable` },
  }),

  getRefundPolicy: tool({
    description: 'Retourne la politique de remboursement officielle.',
    inputSchema: z.object({}),
    execute: async () => ({
      policy:
        'Les remboursements sont étudiés par le service facturation sous 5 jours ' +
        'ouvrés. Le support ne peut ni promettre ni confirmer un remboursement.',
    }),
  }),
};
