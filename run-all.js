// run-all.js : passe tous les tickets dans l’agent et affiche un tableau de synthèse.
import { readFile } from 'node:fs/promises';
import { handleTicket } from './agent.js';

const file = new URL('./tickets.json', import.meta.url);
const tickets = JSON.parse(await readFile(file, 'utf8'));
const rows = [];

for (const ticket of tickets) {
  const r = await handleTicket(ticket);
  const etat = r.guard ? (r.guard.blocked ? 'bloquée' : 'envoyable') : r.decision.action;
  rows.push({
    sujet: ticket.subject.slice(0, 14),
    equipe: r.decision.department,
    conf: Number(r.decision.departmentConfidence.toFixed(2)),
    gravite: Number(r.decision.severity.toFixed(2)),
    etat,
    outils: r.toolCalls ?? 0,
    ms: r.ms,
  });
}
console.table(rows);
