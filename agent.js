// agent.js : agent de support hybride.
//   Jev (décision, quelques millisecondes)  +  Mistral (rédaction et outils)
import { generateText, isStepCount, LLM_MODEL } from './lib/models.js';
import { triage } from './lib/triage.js';
import { guardReply } from './lib/guard.js';
import { tools } from './lib/tools.js';
import { pathToFileURL } from 'node:url';

export async function handleTicket(ticket) {
  const started = Date.now();

  // 1) Jev trie le ticket.
  const decision = await triage(ticket);
  if (decision.action === 'ignore') {
    return {
      decision,
      status: 'ignoré (spam)',
      reply: null,
      ms: Date.now() - started,
    };
  }
  if (decision.action === 'human-review') {
    return {
      decision,
      status: 'escalade humaine',
      reply: null,
      ms: Date.now() - started,
    };
  }

  // 2) Mistral rédige la réponse, avec la possibilité d’appeler des outils.
  const ton =
    decision.angry || decision.severity >= 2
      ? 'Commence par une excuse sincère et rassure le client sur la prise en charge.'
      : 'Reste cordial et concis.';

  const { text, steps } = await generateText({
    model: LLM_MODEL,
    instructions:
      'Tu es un agent de support client francophone. Utilise les outils pour ' +
      'vérifier les faits avant de répondre. Tu n’as PAS le droit de promettre ni ' +
      'de confirmer un remboursement : explique seulement que la demande est ' +
      'transmise au service facturation. ' +
      ton,
    prompt:
      `Équipe : ${decision.department}\n` +
      `Sujet : ${ticket.subject}\n` +
      `Message : ${ticket.message}\n` +
      `Rédige la réponse à envoyer au client (6 lignes maximum).`,
    tools,
    stopWhen: isStepCount(5),
  });
  const toolCalls = (steps ?? []).reduce(
    (n, s) => n + (s.toolCalls?.length ?? 0),
    0,
  );

  // 3) Jev relit la réponse : la classification n’est pas l’autorisation.
  const guard = await guardReply(ticket, text);
  const status = guard.blocked
    ? 'réponse bloquée, relecture humaine'
    : 'réponse prête à envoyer';

  return { decision, status, reply: text, guard, toolCalls, ms: Date.now() - started };
}

// Exécution directe : node --env-file=.env agent.js 2
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { readFile } = await import('node:fs/promises');
  const file = new URL('./tickets.json', import.meta.url);
  const tickets = JSON.parse(await readFile(file, 'utf8'));
  const index = Number(process.argv[2] ?? 0);
  const ticket = tickets[index];
  console.log(`Ticket n°${index} : ${ticket.subject}\n`);
  console.log(JSON.stringify(await handleTicket(ticket), null, 2));
}
