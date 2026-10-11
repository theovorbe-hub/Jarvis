# Belle Saison - consignes pour ce dossier

Ce dossier n'a rien à voir avec l'application Next.js Jarvis : c'est un thème
Shopify (Liquid). Les consignes Next.js d'`AGENTS.md` ne s'y appliquent pas.

- Lire `README.md` avant toute modification : mode de vente, métachamps, boutique.
- Design : suivre le skill `design-taste-frontend` (`.claude/skills/`) et l'identité
  de `docs/maquette.png`. Skills complémentaires : `high-end-visual-design` (finitions
  haut de gamme), `redesign-existing-projects` (amélioration du thème existant) et
  `imagegen-frontend-web` (consignes d'images). En cas de conflit, la maquette du client
  l'emporte (palette, Garamond, coins presque droits). Palette et polices sont définies dans
  `theme/config/settings_schema.json` et `theme/assets/base.css`.
- Textes en français, dans `theme/locales/fr.default.json` ou dans les valeurs par
  défaut des schémas. Apostrophe typographique (’), aucun tiret cadratin ni demi-cadratin.
- Après chaque modification : `cd tools && npm run check && npm test` (0 problème attendu),
  et `npm run preview` pour vérifier le rendu en 1440 px et 390 px.
- Boutique `v6shfu-w1`, thème « Belle Saison » ID `211492798855` (non publié).
  Ne jamais modifier ni publier le thème en ligne (Horizon) sans demande explicite.
- Avant d'envoyer `config/settings_data.json`, `templates/*.json` ou
  `sections/*-group.json` dans Shopify, récupérer d'abord la version de la boutique :
  le marchand les modifie depuis l'éditeur.
