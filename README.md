# JARVIS

Un assistant IA personnel multimodal : chat, voix, mémoire long terme,
recherche web, analyse de documents et d'images, tâches, rappels et
automatisations — dans une interface sombre et futuriste inspirée de
l'expérience technologique de Tony Stark, avec une identité visuelle propre.

Ce dépôt contient le **MVP fonctionnel** décrit dans le brief produit :
chaque écran est réellement connecté à un backend (Next.js API routes +
Prisma + SQLite) et à un vrai moteur IA (Claude, via l'API Anthropic), pas
des maquettes statiques.

## Stack

| Couche       | Choix                                                              |
|--------------|---------------------------------------------------------------------|
| Frontend     | Next.js 14 (App Router) · TypeScript · Tailwind CSS · Framer Motion |
| Backend      | Next.js Route Handlers (API sécurisée, session JWT)                 |
| Base de données | Prisma ORM · SQLite en développement (bascule Postgres triviale) |
| IA           | Claude (Anthropic) via une couche d'abstraction `AIProvider`        |
| Voix         | Web Speech API du navigateur (STT + TTS natifs, sans clé ni coût)   |
| Recherche web| Scraping HTML DuckDuckGo (fonctionne sans clé API)                  |
| Météo        | Open-Meteo (gratuit, sans clé)                                      |
| Documents    | pdf-parse, mammoth (docx), exceljs (xlsx) — extraction réelle       |
| Automatisations | node-cron in-process (voir limites plus bas)                     |

## Démarrage rapide

```bash
npm install
cp .env.example .env
# Renseignez ANTHROPIC_API_KEY dans .env (https://console.anthropic.com)
npm run db:push   # crée la base SQLite locale à partir du schéma Prisma
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000), créez un compte, et
JARVIS est opérationnel. La recherche web, la météo et l'analyse de
documents/images fonctionnent immédiatement ; le chat et l'analyse
nécessitent une clé `ANTHROPIC_API_KEY` valide.

## Architecture

```
src/
  app/
    (app)/            écrans protégés : jarvis, dashboard, memory, tasks,
                       documents, automations, security (+ sidebar layout)
    login/ register/  écrans publics
    api/               routes API (chat, memory, tasks, reminders,
                       automations, files, vision, dashboard, permissions,
                       connections, activity, sécurité)
  components/
    jarvis/            orbe animé, fil de conversation, mode plein écran
    layout/             sidebar, navigation mobile, raccourcis clavier
    ui/                 primitives partagées
  lib/
    ai/                 abstraction AIProvider + implémentation Anthropic
                       + registre d'outils (function calling)
    agents/            modules spécialisés : memory, research, documents,
                       vision, planner, automation, core (persona + routage)
    voice/             hooks Web Speech API (STT, TTS, mot-clé « Jarvis »)
    automation/         scheduler cron in-process + exécuteurs d'actions
    search/, documents/, weather.ts, storage.ts, permissions.ts, activity.ts
  middleware.ts        protection des routes par session JWT (Edge, via `jose`)
  instrumentation.ts    démarre le scheduler d'automatisations au boot serveur
prisma/schema.prisma    modèle de données complet
```

### JARVIS CORE et le routage vers les modules

Le CORE décrit dans le brief est implémenté comme la combinaison de
`src/app/api/chat/route.ts` et du registre d'outils
(`src/lib/ai/tools.ts`) : Claude choisit lui-même quel outil — donc quel
module spécialisé (MEMORY, RESEARCH, DOCUMENTS, VISION, PLANNER,
AUTOMATION) — appeler, à partir de la description de chaque outil et de la
demande de l'utilisateur. Chaque outil est exécuté côté serveur dans
`executeTool()`, qui vérifie systématiquement les permissions de
l'utilisateur avant d'agir et journalise l'action dans `ActivityLog`.

### Changer de modèle IA

Toute la couche IA passe par l'interface `AIProvider`
(`src/lib/ai/provider.ts`). Pour changer de modèle ou de fournisseur,
implémentez l'interface (voir `src/lib/ai/anthropic.ts`) et changez une
seule ligne dans `src/lib/ai/index.ts`.

## Sécurité

- Mots de passe hashés (bcrypt), sessions signées (JWT via `jose`,
  cookie `httpOnly`).
- Chaque capacité sensible (mémoire, recherche web, fichiers, vision,
  automatisations, écoute permanente, futurs accès agenda/email) est un
  enregistrement `Permission` par utilisateur, désactivé par défaut pour
  tout ce qui est sensible ou pas encore réellement intégré. Rien ne
  s'exécute sans permission accordée — voir `hasPermission()` dans
  `src/lib/ai/tools.ts`.
- Toute action des outils est journalisée dans `ActivityLog`, visible sur
  l'écran **Sécurité & Permissions**.
- Suppression de compte complète et irréversible (`/api/security/delete-account`)
  supprime en cascade conversations, mémoire, tâches, fichiers,
  automatisations, connexions et journal.

## Limites connues du MVP

- **Automatisations planifiées** : le scheduler cron tourne dans le
  process Node du serveur (`npm run start`). Il fonctionne tant que ce
  process est actif, mais ne survit pas à un déploiement serverless/edge
  sans adaptation (remplacer par un cron externe qui appelle un endpoint
  d'exécution).
- **Intégrations tierces** (calendrier, email, cloud, musique, domotique,
  messagerie) : l'architecture est prête (modèle `Connection`, écran
  Sécurité, permissions dédiées) mais les connexions OAuth réelles ne sont
  pas implémentées — c'est explicitement une préparation pour plus tard,
  comme demandé dans le brief.
- **Reconnaissance/synthèse vocale** : repose sur le support navigateur du
  Web Speech API (excellent sur Chrome/Edge, plus limité sur Firefox).
- `npm audit` signale des vulnérabilités restantes dans Next.js 14.2.x
  (non corrigées sans passer à Next 16, changement majeur hors scope de ce
  MVP) et dans une dépendance transitive de `node-cron`/`exceljs`
  (`uuid`, sévérité modérée, non exploitable dans notre usage). À évaluer
  avant une mise en production.

## Raccourcis clavier

- `Ctrl/Cmd + J` : ouvrir JARVIS depuis n'importe quel écran
- `Entrée` : envoyer un message (`Maj+Entrée` pour une nouvelle ligne)
- `Échap` : effacer le champ de saisie / fermer le mode plein écran
