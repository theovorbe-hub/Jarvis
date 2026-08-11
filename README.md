# JARVIS — Assistant IA personnel

Un assistant IA personnel multimodal, inspiré de l'expérience de l'assistant de Tony Stark : discussion naturelle, commandes vocales, mémoire long terme, recherche web, analyse de documents/images, tâches, rappels et automatisations — le tout dans une interface premium, sombre et futuriste.

## Architecture

Application full-stack **Next.js 14 (App Router, TypeScript)** — un seul déploiement sert le frontend et le backend.

```
src/
  app/                    Pages (App Router) + routes API (/app/api/**)
  components/             UI React (orb, chat, dashboard, mémoire, automatisations, sécurité, documents)
  hooks/                  useSpeechRecognition, useSpeechSynthesis, useSystemStatus
  store/                  État global (zustand) : orbe, réglages voix
  lib/
    ai/                   Couche d'abstraction IA (provider-agnostic) + agent + outils (function calling)
    prisma.ts             Client Prisma
    auth.ts                NextAuth (credentials, JWT)
    search.ts              Recherche web (Tavily ou DuckDuckGo sans clé)
    weather.ts              Météo (Open-Meteo, sans clé)
    documents.ts            Extraction de texte PDF/DOCX/XLSX
    cron.ts / automationRunner.ts   Scheduler d'automatisations (node-cron)
prisma/schema.prisma      Modèle de données (SQLite en dev)
```

### Couche IA (agents & outils)

`src/lib/ai/provider.ts` définit une interface `AIProvider` neutre. `src/lib/ai/anthropic.ts` l'implémente avec le SDK Anthropic. Changer de modèle ou de fournisseur ne touche à aucun autre fichier — seul `AI_PROVIDER`/`AI_MODEL` dans `.env` changent.

Le **CORE** (`src/lib/ai/agent.ts`) orchestre une boucle de *function calling* : à chaque tour, le modèle peut appeler un outil (mémoire, tâches, rappels, recherche web, documents, automatisations), le résultat est réinjecté, jusqu'à une réponse finale. Ce mécanisme réalise les modules décrits dans le brief :

| Module      | Réalisé par                                          |
|-------------|-------------------------------------------------------|
| RESEARCH    | outil `web_search` (`src/lib/search.ts`)              |
| MEMORY      | outils `remember` / `recall_memory` / `forget`         |
| VISION      | `provider.describeImage` (upload image / `/api/vision`)|
| DOCUMENTS   | `src/lib/documents.ts` + outils `list_files` / `get_file_content` |
| AUTOMATION  | `src/lib/automationRunner.ts` + `node-cron`             |
| PLANNER     | outils tâches / rappels                                |
| VOICE       | hooks Web Speech API côté client                       |

Les actions sensibles (suppression d'un souvenir, création d'une automatisation récurrente) exigent un paramètre `confirmed` : si absent, l'outil renvoie une demande de confirmation que le modèle doit relayer à l'utilisateur avant de rappeler l'outil.

### Base de données

SQLite en développement via Prisma (`DATABASE_URL="file:./dev.db"`), migrable vers Postgres/MySQL en changeant simplement `provider` dans `prisma/schema.prisma`. Tables : `User`, `Conversation`, `Message`, `Memory`, `Task`, `Reminder`, `Automation`, `FileAsset`, `Connection`, `Permission`, `ActivityLog`.

### Voix

Reconnaissance et synthèse vocales via les API natives du navigateur (**Web Speech API**) — aucune clé requise, fonctionne côté client. Le mode « toujours à l'écoute » (détection du mot « Jarvis ») ne démarre qu'après consentement explicite (case à cocher dédiée dans les réglages).

### Sécurité

- Authentification par mot de passe (bcrypt) + session JWT (NextAuth).
- Chaque route API vérifie la session et scope toutes les requêtes à `userId`.
- Page **Sécurité & Permissions** : permissions granulaires (mémoire, voix, écoute permanente, web, fichiers, automatisations), intégrations connectées/déconnectées explicitement, journal d'activité, suppression complète du compte.
- Aucune action irréversible n'est exécutée sans confirmation explicite (voir `TOOL_DEFINITIONS`/`executeTool` dans `src/lib/ai/tools.ts`).

## Démarrage

```bash
npm install
cp .env.example .env   # renseignez au minimum ANTHROPIC_API_KEY
npm run db:push        # crée la base SQLite locale
npm run dev
```

Ouvrez `http://localhost:3000`, créez votre compte, et JARVIS est prêt.

### Variables d'environnement clés

- `ANTHROPIC_API_KEY` — requis pour toute interaction IA (chat, vision, résumés de documents).
- `TAVILY_API_KEY` — optionnel ; sans clé, la recherche web utilise un fallback DuckDuckGo sans clé.
- `DEFAULT_LAT` / `DEFAULT_LON` / `DEFAULT_CITY` — localisation par défaut pour la météo (Open-Meteo, sans clé).

## Raccourcis clavier

- `Ctrl/Cmd + J` — ouvrir JARVIS
- `Espace` — activer la voix (hors zone de saisie)
- `Échap` — arrêter l'écoute / fermer le mode plein écran

## Prochaines étapes (au-delà du MVP)

- OAuth réel pour les intégrations (calendrier, email, cloud, domotique…) — le modèle `Connection` et la page Sécurité sont déjà prêts à recevoir ces flux.
- Mode Agent multi-étapes avec plan visible et validation étape par étape (le socle function-calling est en place).
- Notifications push pour les rappels et automatisations.
