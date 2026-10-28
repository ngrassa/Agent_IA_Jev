// test/triage.test.js : teste les règles de seuil SANS réseau, avec un modèle simulé.
// Lancement : node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { Experimental_EvaluationMockModelV4 as MockModel } from 'ai/test';
import { experimental_evaluate as evaluate } from 'ai';

// Même logique que lib/triage.js, extraite pour être testable avec un faux modèle.
async function route(model, minConfidence = 0.6, minProbability = 0.7) {
  const result = await evaluate({
    model,
    state: 'ticket de test',
    questions: {
      department: {
        type: 'choice',
        instructions: 'Quelle équipe ?',
        criteria: { billing: 'Facturation', technical: 'Technique', spam: 'Spam' },
      },
    },
  });
  const d = result.answers.department;
  const confidence = result.providerMetadata?.typesafe?.confidence?.department ?? 0;
  const selected = d.probabilities?.[d.choice] ?? 0;
  if (confidence < minConfidence || selected < minProbability) return 'human-review';
  return d.choice === 'spam' ? 'ignore' : 'assign';
}

const mock = (probabilities, choice, confidence) =>
  new MockModel({
    doEvaluate: async () => ({
      answers: { department: { type: 'choice', choice, probabilities } },
      warnings: [],
      providerMetadata: { typesafe: { confidence: { department: confidence } } },
    }),
  });

test('cas clair : le ticket est assigné', async () => {
  const m = mock({ billing: 0.03, technical: 0.95, spam: 0.02 }, 'technical', 0.9);
  assert.equal(await route(m), 'assign');
});

test('cas ambigu : escalade humaine', async () => {
  const m = mock({ billing: 0.45, technical: 0.4, spam: 0.15 }, 'billing', 0.3);
  assert.equal(await route(m), 'human-review');
});

test('spam clair : ignoré', async () => {
  const m = mock({ billing: 0.01, technical: 0.01, spam: 0.98 }, 'spam', 0.95);
  assert.equal(await route(m), 'ignore');
});
