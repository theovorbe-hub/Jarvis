# JARVIS — assistant IA personnel

Un centre de contrôle personnel multimodal : discussion naturelle, voix, mémoire long terme,
recherche web, analyse de documents et d'images, tâches, rappels et automatisations — dans une
interface sombre, futuriste et glassmorphique, responsive du bureau au smartphone.

Toutes les fonctions ci-dessous sont réellement connectées à leur backend : rien n'est un écran
factice. Si une intégration externe (moteur IA, recherche web) n'est pas configurée, l'application
le signale explicitement plutôt que d'inventer une réponse.

## Fonctionnalités (MVP)

- **Authentification** — compte email/mot de passe, session JWT en cookie httpOnly.
- **Chat JARVIS** — orbe animé (écoute / réflexion / réponse), conversation textuelle, actions et
  sources affichées sous chaque réponse.
- **Voix** — reconnaissance vocale et synthèse vocale via l'API Web Speech du navigateur (aucune
  clé requise), choix de voix, volume, coupure du son.
- **Mémoire long terme** — JARVIS retient prénom, préférences, projets, habitudes, objectifs,
  personnes ; page dédiée avec cartes consultables / modifiables / supprimables.
- **Centre de contrôle** — heure, météo (Open-Meteo, sans clé), tâches prioritaires, rappels,
  état système (réseau, batterie, moteur IA, recherche web, connexions), flux d'activité de JARVIS.
- **Tâches & rappels** — CRUD complet, créables aussi en langage naturel via le chat.
- **Documents & vision** — dépôt de fichiers (PDF, Word, Excel, texte, images), extraction,
  résumé, questions/réponses, comparaison de documents, analyse d'image (OCR, description, objets).
- **Recherche web** — module branché sur l'API Tavily ; sans clé, JARVIS le dit clairement au lieu
  d'halluciner des résultats.
- **Automatisations** — règles programmées (cron) exécutées par un ordonnanceur serveur réel
  (briefing quotidien, liste de priorités, rappels récurrents, notes).
- **Sécurité & permissions** — permissions granulaires révocables, connexions de services externes
  soumises à consentement explicite, journal d'activité, suppression complète des données.
- **Mode plein écran** — expérience immersive avec noyau lumineux, horloge, activité récente.
- **Raccourcis clavier** — `Ctrl/Cmd+J` ouvre JARVIS, `Espace` active la voix, `Échap` interrompt/ferme.

## Architecture

```
src/
  app/                    Next.js App Router (pages + routes API)
    (app)/                Pages authentifiées (shell avec navigation)
    api/                  Routes API (auth, chat, memories, tasks, files, automations, ...)
    jarvis/               Mode plein écran immersif
  components/             Composants UI (jarvis/, layout/, dashboard/, ui/)
  lib/
    agents/                Modules spécialisés : core, memory, research, planner,
                            documents, vision, automation, automation-runner
    ai/                    Couche d'abstraction IA (client, outils, prompt système)
    hooks/useVoice.ts       Speech-to-Text / Text-to-Speech
    auth.ts, db.ts, permissions.ts, activity.ts, scheduler.ts
prisma/schema.prisma       Modèle de données (utilisateurs, mémoire, tâches, rappels,
                            automatisations, fichiers, connexions, permissions, journal)
```

**Couche IA découplée du modèle** : `lib/ai/client.ts` centralise le client Anthropic et le nom
du modèle (variable d'environnement `ANTHROPIC_MODEL`). `lib/agents/core.ts` orchestre une boucle
d'appel d'outils (function calling) qui distribue les demandes vers les modules spécialisés —
changer de fournisseur de modèle ne nécessite de toucher qu'à cette couche.

**Agents** : CORE (orchestrateur) décide quel module utiliser — MEMORY, RESEARCH, PLANNER,
DOCUMENTS, VISION, AUTOMATION — via des outils typés (JSON schema), avec confirmation explicite
exigée avant toute action décrite comme sensible ou irréversible.

## Démarrage

```bash
npm install
cp .env.example .env   # puis renseignez vos clés
npx prisma migrate dev
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000), créez un compte, et JARVIS est prêt.

### Variables d'environnement

| Variable | Requis | Description |
| --- | --- | --- |
| `DATABASE_URL` | oui | Base SQLite locale (`file:./dev.db` par défaut) |
| `JWT_SECRET` | oui | Secret de signature des sessions — générez-en un avec `openssl rand -hex 32` |
| `ANTHROPIC_API_KEY` | recommandé | Active le raisonnement, l'analyse de documents et la vision |
| `ANTHROPIC_MODEL` | non | Modèle Claude à utiliser (défaut : `claude-sonnet-5`) |
| `TAVILY_API_KEY` | non | Active la recherche web réelle (sinon JARVIS le signale) |

Sans `ANTHROPIC_API_KEY`, l'interface reste pleinement fonctionnelle (comptes, mémoire, tâches,
rappels, automatisations, tableau de bord) ; JARVIS informe simplement qu'il ne peut pas encore
raisonner tant que la clé n'est pas fournie.

### Base de données

SQLite par défaut pour un démarrage sans dépendance externe. Le schéma Prisma (`prisma/schema.prisma`)
est prêt à être pointé vers PostgreSQL/MySQL en production en changeant simplement le `provider`
du datasource et `DATABASE_URL`.

### Automatisations

Un ordonnanceur démarre avec le serveur (`src/instrumentation.ts` → `src/lib/scheduler.ts`) et
vérifie chaque minute les automatisations dues, en s'appuyant sur des expressions cron standard.

## Notes de sécurité

- Mots de passe hachés avec bcrypt, sessions signées (JWT) en cookie `httpOnly`/`sameSite=lax`.
- Toute suppression (mémoire, tâche, rappel, automatisation, compte) exige une confirmation dans
  l'interface ; l'agent JARVIS ne peut pas exécuter d'action marquée sensible sans confirmation
  explicite de l'utilisateur dans la conversation.
- Les connexions à des services externes ne créent une entrée en base qu'après consentement
  explicite coché par l'utilisateur ; elles sont révocables à tout moment depuis la page Sécurité.
- La suppression de compte est irréversible, protégée par mot de passe, et efface les fichiers
  associés sur le disque en plus des données en base (cascade Prisma).
