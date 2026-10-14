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
- Vidéos réglées depuis le code : le format de référence d'un réglage `video` dans un
  modèle JSON n'est pas documenté, et `shopify://files/videos/<fichier>` ne fonctionne pas.
  Utiliser les réglages « lien direct » (`video_url`, `video_mobile_url`,
  `background_video_url`) avec l'URL `originalSource` du fichier (API Admin, Contenu > Fichiers).
  Une vidéo choisie dans l'éditeur reste prioritaire sur le lien direct.
- Veille concurrentielle, recherche de produits (AliExpress, CJ Dropshipping, imprimeurs
  européens) et import de produits dans la boutique : suivre la compétence
  `veille-sourcing-belle-saison` (`.claude/skills/`). Produits toujours créés en brouillon.
- Répondre à la cliente en français.
- Chaque description de produit de la boutique se rédige avec la compétence
  `description-de-produit` (6 blocs : accroche, promesse, arguments, pour qui,
  caractéristiques, réassurance et appel à l’action), puis se contrôle avec son script.
- Ventes, conversion, panier moyen, offres, réassurance, panier et paiement : suivre la
  compétence `marketing-conversion` (techniques honnêtes uniquement ; remises et frais de port
  validés par la cliente avant création). Ne jamais écrire de texte qui fasse douter le client
  (« Et si… ? », « Vous hésitez ? », « inquiet ») : affirmer l’engagement. Contrôle :
  `python3 ../.claude/skills/marketing-conversion/scripts/controle_confiance.py theme`.
- Ordinateur et mobile doivent montrer le même site : mêmes contenus, mêmes vidéos (version
  verticale du même film), rien de masqué sur mobile ; seule la mise en page s’adapte. Toute
  nouvelle vidéo d’ouverture se fait en deux versions (`montage` et `montage-mobile`).
- Clientèle visée : lire `docs/persona.md` (Claire, 41 ans, maison ancienne rénovée pièce par
  pièce ; Léa et la chambre d’enfant ; Hélène et la maison de campagne). Toute adaptation du
  site, fiche produit ou offre se décide à partir de ce persona.
- Chaque produit importé doit avoir son motif à plat (`papier_peint.visuel`, et
  `largeur_visuel` pour un motif qui se répète) : sans lui, le simulateur « Voir sur mon mur »
  ne s’affiche pas. Voir `README.md`, section « Voir sur mon mur ».
- Prix : environ 39 € le m² TTC, aligné sur le bas du marché (fourchette 35 à 42 €), avec au moins
  25 % de marge nette. Grille des concurrents et calcul : compétence `veille-sourcing-belle-saison`,
  `references/sourcing.md` (« Règle de prix »).

