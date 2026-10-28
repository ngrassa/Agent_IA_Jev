# TP — Agent IA hybride : Jev + Mistral

Agent de support client qui associe **deux types de modèles** derrière une seule clé d'API :

- **Jev** (TypeSafe AI), un modèle de *décision* : il ne génère pas de texte, il renvoie des choix, des scores et des probabilités typés, avec une confiance.
- **Mistral** (`mistral/mistral-small`), un LLM classique : il rédige les réponses et appelle des outils.

Les deux sont appelés via **Vercel AI Gateway** avec la même variable `AI_GATEWAY_API_KEY`, grâce à l'**AI SDK** (paquet npm `ai`, version 7).

> Travaux pratiques pour étudiants de Master (module IA Agentic) — ISET Sousse.
> Le sujet détaillé du TP (Word / PDF) accompagne ce dépôt.

---

## Sommaire

1. [Principe](#principe)
2. [Architecture](#architecture)
3. [Prérequis](#prérequis)
4. [Installation](#installation)
5. [Configuration](#configuration)
6. [Utilisation](#utilisation)
7. [Structure du projet](#structure-du-projet)
8. [Comment ça marche](#comment-ça-marche)
9. [Régler les seuils](#régler-les-seuils)
10. [Tests sans réseau](#tests-sans-réseau)
11. [Coût](#coût)
12. [Dépannage](#dépannage)
13. [Pistes d'amélioration](#pistes-damélioration)
14. [Sécurité](#sécurité)

---

## Principe

Une entreprise reçoit des tickets de support. L'agent doit :

- trier vite chaque ticket (équipe concernée, gravité, colère du client, demande de remboursement) ;
- ignorer le spam sans dépenser un appel au LLM ;
- répondre au client **sans jamais promettre un remboursement**, que seul le service facturation peut accorder ;
- confier à un humain les cas ambigus ou les réponses douteuses.

Chaque composant fait ce qu'il sait faire de mieux :

| Composant | Rôle |
|---|---|
| **Jev** | Trier le ticket, puis relire la réponse du LLM (garde-fou) |
| **Mistral** | Rédiger la réponse, interroger les outils |
| **Le code** | Appliquer les règles : ignorer, escalader, assigner, bloquer |

Principe central : **classer n'est pas autoriser**. Jev estime, mais c'est une règle écrite dans le code qui décide.

## Architecture

```text
Ticket
  │
  ▼
┌────────────────────┐
│ Jev : triage       │  équipe (choice), gravité (score),
│ lib/triage.js      │  colère et remboursement (boolean)
└─────────┬──────────┘
          ▼
┌────────────────────┐   spam clair            → ignoré (Mistral jamais appelé)
│ Règles (seuils)    │   confiance trop basse  → relecture humaine
└─────────┬──────────┘   sinon                 → pris en charge par l'agent
          ▼
┌────────────────────┐
│ Mistral + outils   │  getOrderStatus, getRefundPolicy
│ agent.js           │  (lib/tools.js)
└─────────┬──────────┘
          ▼
┌────────────────────┐
│ Jev : garde-fou    │  la réponse promet-elle un remboursement ?
│ lib/guard.js       │  est-elle professionnelle ?
└─────────┬──────────┘
          ▼
   réponse envoyable  ou  relecture humaine
```

## Prérequis

- **Node.js 22 ou plus** (exigé par l'AI SDK 7) et `npm`
- Un compte **Vercel** (gratuit) et une **clé AI Gateway**
- Un terminal (Linux, macOS, ou Windows avec PowerShell)

Vérifiez votre version :

```bash
node -v    # doit afficher v22.x ou plus
```

Installation de Node.js 22 sous Ubuntu / Debian :

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

Sous Windows : `winget install OpenJS.NodeJS.LTS` (ouvrez ensuite un nouveau terminal).

## Installation

```bash
git clone https://github.com/ngrassa/Agent_IA_Jev.git
cd Agent_IA_Jev
npm install
```

> Si le dépôt n'a pas de `package-lock.json`, `npm install` lit `package.json` et installe `ai` et `zod`.

## Configuration

1. Créez un compte sur [vercel.com/signup](https://vercel.com/signup).
2. Dans le tableau de bord, ouvrez **AI Gateway** et créez une clé API.
3. Copiez le modèle de fichier d'environnement et collez votre clé :

```bash
cp .env.example .env
# puis éditez .env :
# AI_GATEWAY_API_KEY=votre-cle-ici
```

Pas de guillemets, pas d'espace autour du `=`. Le fichier `.env` est ignoré par Git (voir `.gitignore`).

### Variables d'environnement

| Variable | Rôle | Valeur par défaut |
|---|---|---|
| `AI_GATEWAY_API_KEY` | Clé de la passerelle (**obligatoire**) | aucune |
| `JEV_MODEL` | Modèle de décision | `typesafe-ai/jev` |
| `LLM_MODEL` | Modèle de langage | `mistral/mistral-small` |
| `MIN_CONFIDENCE` | Seuil de confiance du triage | `0.6` |
| `MIN_PROBABILITY` | Seuil de probabilité de l'option choisie | `0.7` |

## Utilisation

Tous les scripts se lancent avec `node --env-file=.env` pour charger la clé. Des raccourcis npm sont fournis.

| Commande | Rôle |
|---|---|
| `npm run t01` | Test de la clé avec Mistral seul |
| `npm run t02` | Première question booléenne posée à Jev |
| `npm run t03` | Questions `choice`, `score`, `boolean` et lecture de la confiance |
| `npm run agent -- N` | Traite le ticket numéro N de `tickets.json` (à partir de 0) |
| `npm run all` | Traite les six tickets et affiche un tableau de synthèse |
| `npm test` | Teste les règles de seuil avec un modèle simulé (sans réseau) |

Exemples :

```bash
# Un ticket technique urgent
npm run agent -- 0

# Le ticket de spam : Mistral n'est jamais appelé
npm run agent -- 3

# Les six tickets, avec un seuil de confiance plus strict
MIN_CONFIDENCE=0.9 npm run all
```

Sous Windows PowerShell :

```powershell
$env:MIN_CONFIDENCE = "0.9"; npm run all
```

### Exemple de sortie (indicatif)

Les valeurs varient d'une exécution à l'autre, surtout le texte de Mistral.

```text
┌─────────┬──────────────────┬─────────────┬──────┬─────────┬────────────────┬────────┬──────┐
│ (index) │ sujet            │ equipe      │ conf │ gravite │ etat           │ outils │ ms   │
├─────────┼──────────────────┼─────────────┼──────┼─────────┼────────────────┼────────┼──────┤
│ 0       │ 'API en erreur'  │ 'technical' │ 0.86 │ 2.71    │ 'envoyable'    │ 1      │ 2310 │
│ 1       │ 'Double prélève' │ 'billing'   │ 0.79 │ 1.34    │ 'envoyable'    │ 2      │ 2875 │
│ 2       │ 'Mot de passe o' │ 'account'   │ 0.88 │ 1.05    │ 'envoyable'    │ 0      │ 1690 │
│ 3       │ 'Gagnez un smar' │ 'spam'      │ 0.97 │ 0.02    │ 'ignore'       │ 0      │ 578  │
│ 4       │ 'Question'       │ 'account'   │ 0.21 │ 1.12    │ 'human-review' │ 0      │ 557  │
│ 5       │ 'Remboursement'  │ 'billing'   │ 0.81 │ 2.05    │ 'envoyable'    │ 2      │ 3120 │
└─────────┴──────────────────┴─────────────┴──────┴─────────┴────────────────┴────────┴──────┘
```

## Structure du projet

```text
tp-agent-hybride/
├── .env.example          modèle du fichier de secrets
├── .gitignore
├── package.json
├── tickets.json          six tickets de test
├── 01-mistral.js         test de Mistral seul
├── 02-jev-boolean.js     première question à Jev
├── 03-jev-triage.js      questions choice, score et boolean
├── agent.js              agent complet : triage, rédaction, garde-fou
├── run-all.js            synthèse des six tickets
├── lib/
│   ├── models.js         choix des modèles, importations du SDK
│   ├── triage.js         Jev + règles de décision
│   ├── tools.js          outils du LLM (données simulées)
│   └── guard.js          relecture de la réponse par Jev
└── test/
    └── triage.test.js    tests des seuils avec un faux modèle
```

## Comment ça marche

### Jev : des décisions typées

Jev reçoit un **état** (texte ou objet) et des **questions** typées. Il évalue chaque question indépendamment.

| Type | Ce qu'il fait | Champs de la réponse |
|---|---|---|
| `choice` | Choisit une option dans une liste | `choice`, `probabilities` |
| `score` | Note sur une échelle ordonnée (2 à 10 niveaux) | `score`, `probabilities` |
| `boolean` | Estime si un énoncé est vrai | `probability` |

La **confiance** (de 0 à 1) est fournie pour `choice` et `score` dans `result.providerMetadata.typesafe.confidence`. Elle mesure à quel point la distribution est concentrée, ce qui est différent de la probabilité de l'option choisie.

Bonne pratique : poser des questions **atomiques** et combiner les réponses dans le code.

### Les règles de décision (`lib/triage.js`)

```js
// Règle 1 : le spam est ignoré
if (department.choice === 'spam' && selected >= MIN_PROBABILITY) { … ignore }
// Règle 2 : sous les seuils, on ne devine pas
if (confidence < MIN_CONFIDENCE || selected < MIN_PROBABILITY) { … human-review }
// Règle 3 : sinon l'agent prend la main
return { action: 'assign', … };
```

Si la confiance ou la distribution manque dans la réponse, le code retombe sur `0` et le ticket est escaladé : il échoue du côté prudent.

### Mistral et ses outils (`agent.js`, `lib/tools.js`)

Mistral reçoit une consigne qui lui **interdit de promettre un remboursement**, et son ton s'adapte à l'analyse de Jev (client en colère, gravité élevée). Il dispose de deux outils :

- `getOrderStatus` : état d'une commande (données simulées) ;
- `getRefundPolicy` : politique officielle de remboursement.

`stopWhen: isStepCount(5)` laisse le SDK boucler (appel d'outil, résultat, nouvel appel) jusqu'à la réponse finale, au maximum 5 tours. Sans cette option, il s'arrêterait au premier appel d'outil.

### Le garde-fou (`lib/guard.js`)

Après la rédaction, Jev répond à deux questions sur la réponse : promet-elle un remboursement ? est-elle professionnelle ? La réponse est **bloquée** et envoyée en relecture humaine si la probabilité de promesse est ≥ 0,5 ou si le ton professionnel est < 0,5. Jev classe, mais c'est la règle du code qui bloque.

## Régler les seuils

Les seuils par défaut (0,6 et 0,7) sont des points de départ.

- **Relever** les seuils : moins d'erreurs automatiques, mais plus de tickets envoyés à un humain.
- **Abaisser** les seuils : plus d'automatisation, plus de risque d'erreur.

On règle le seuil **selon le coût d'une erreur** : une action sans conséquence tolère ~0,7, une action irréversible (rembourser, supprimer) exige ~0,9 ou plus, avec une confirmation en dessous. Pour choisir sérieusement, passez des tickets dont vous connaissez la bonne réponse dans Jev et comparez les probabilités annoncées aux résultats observés.

## Tests sans réseau

```bash
npm test
```

Les tests utilisent `Experimental_EvaluationMockModelV4` (importé depuis `ai/test`) pour simuler Jev. Ils vérifient les **règles de seuil**, pas la qualité des réponses du vrai modèle : ils sont instantanés, gratuits et reproductibles, et ne demandent aucune clé.

## Coût

Ordres de grandeur sur la passerelle (à vérifier sur la page de chaque modèle, les tarifs changent) :

| Modèle | Entrée (par million de tokens) | Sortie (par million de tokens) |
|---|---|---|
| `typesafe-ai/jev` | ~ 0,042 $ | gratuite |
| `mistral/mistral-small` | ~ 0,10 $ | ~ 0,30 $ |

Le TP complet représente quelques centimes. Le spam coûte presque rien : un seul appel à Jev, jamais d'appel à Mistral. Une passerelle peut offrir un crédit gratuit mensuel : vérifiez le montant réel dans votre tableau de bord Vercel.

Les journaux de la passerelle (modèle, tokens, coût par appel) se consultent dans le tableau de bord, rubrique AI Gateway.

## Dépannage

| Symptôme | Cause probable | Remède |
|---|---|---|
| Erreur 401 ou 403 | Clé absente, mal copiée ou expirée | Revoir `.env`, lancer depuis le bon dossier, recréer la clé |
| `bad option: --env-file` | Node.js trop ancien | Installer Node.js 22 ou plus |
| `Cannot use import statement` | Modules ES non activés | `npm pkg set type=module` |
| Jev ou `experimental_evaluate` introuvable | SDK inférieur à 7.0.105 | `npm install ai@latest` |
| `NoSuchModelError` | Identifiant de modèle incorrect | Copier l'identifiant depuis la page du modèle sur la passerelle |
| `InvalidResponseDataError` | Réponse invalide du fournisseur | Relancer la requête |
| Erreur 429 | Trop de requêtes en peu de temps | Attendre, ne pas relancer en boucle |
| Refus faute de crédit | Crédit gratuit épuisé ou absent | Vérifier le solde dans le tableau de bord |
| Réponses différentes à chaque essai | Mistral est non déterministe | Normal ; comparez plutôt les décisions de Jev |

> Note sur le nom de la fonction : dans l'AI SDK 7, `experimental_decide` est un alias de `experimental_evaluate`. Ce dépôt utilise `experimental_evaluate`.

## Pistes d'amélioration

- Changer de LLM en modifiant seulement `LLM_MODEL`, et comparer le ton et le coût.
- Appeler Mistral directement (paquet `@ai-sdk/mistral`, clé `MISTRAL_API_KEY`), en vérifiant la compatibilité de version avec le SDK 7.
- Évaluer Jev sur 30 à 50 tickets annotés à la main pour choisir les seuils d'après les erreurs tolérables.
- Ajouter une question à `triage` (par exemple `isVip`, un `boolean`) pour moduler la priorité.
- Écrire les tickets `human-review` et les réponses bloquées dans un fichier JSON pour un conseiller.
- Gérer l'erreur 429 par des relances espacées.
- Exposer Jev comme outil MCP à un autre agent (projet communautaire `jev-mcp`, à lire avant usage).

## Sécurité

- Ne publiez **jamais** votre clé `AI_GATEWAY_API_KEY` : ni dans le code, ni dans un commit, ni dans une capture d'écran.
- Vérifiez que `.env` figure bien dans `.gitignore` avant votre premier `git add`.
- Si une clé a été exposée, supprimez-la dans le tableau de bord Vercel et créez-en une nouvelle.
- Les outils de ce dépôt travaillent sur des données **simulées** : un vrai système doit ajouter authentification, journalisation et contrôle des droits.

## Auteur

Pr Noureddine GRASSA — ISET Sousse, Département Technologies de l'Informatique.

## Licence

À définir (par exemple MIT). Ajoutez un fichier `LICENSE` avant publication si vous souhaitez autoriser la réutilisation.
