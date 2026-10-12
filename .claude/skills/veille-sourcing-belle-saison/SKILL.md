---
name: veille-sourcing-belle-saison
description: Veille concurrentielle sur Google, recherche de produits (sourcing) adaptés au positionnement de Belle Saison, boutique Shopify de papiers peints d’exception, et import de ces produits dans la boutique Shopify depuis AliExpress, CJ Dropshipping ou une plateforme équivalente. Utiliser cette compétence dès que l’utilisateur parle de concurrents, d’analyse de marché, de prix pratiqués, de tendances, de trouver ou sélectionner des produits ou des fournisseurs, d’AliExpress, de CJ Dropshipping (parfois écrit « CG Dropshipping »), de DSers, de dropshipping, d’impression à la demande, ou d’ajouter, importer ou créer des produits dans la boutique, même s’il ne nomme aucune plateforme.
---

# Veille, sourcing et import de produits pour Belle Saison

Belle Saison vend des papiers peints d’exception, sur mesure au m² ou au rouleau, pour des
« maisons de caractère ». Cette compétence sert à trois travaux qui s’enchaînent souvent :

1. **Veille concurrentielle** : qui vend quoi, à quel prix, avec quelles promesses.
2. **Sourcing** : trouver des produits et des fournisseurs cohérents avec le positionnement.
3. **Import Shopify** : créer les produits retenus dans la boutique, en brouillon, au format
   attendu par le thème.

Lire `references/positionnement.md` avant tout travail : c’est le filtre qui décide si un
concurrent est pertinent et si un produit a sa place dans la boutique.

## Règles permanentes

- **Répondre en français**, avec un vocabulaire simple (l’utilisateur n’est pas développeur),
  apostrophe typographique (’) et sans tiret cadratin ni demi-cadratin dans les textes
  destinés au client ou à la boutique.
- **Citer ses sources** : chaque prix, délai ou affirmation sur un concurrent ou un fournisseur
  vient avec son lien. Ce qui n’a pas pu être vérifié est dit comme tel.
- **Rien n’est publié sans accord** : les produits sont créés en brouillon (`DRAFT`). La boutique
  en ligne (thème Horizon) affiche immédiatement tout produit actif, donc l’activation revient
  à l’utilisateur.
- **Promesses du site** : le site annonce « Impression européenne haut de gamme », « Livraison
  sous 5 à 7 jours », « Échantillon offert », « Sur-mesure inclus » et « Écologie ». Un produit
  imprimé en Chine et livré en 15 jours contredirait ces promesses (pratique commerciale
  trompeuse). Pour chaque produit proposé, vérifier l’origine, le délai réel vers la France et
  la matière, et signaler tout écart. Proposer alors soit un autre fournisseur, soit une
  correction des promesses du site : c’est à l’utilisateur de trancher.
- **Pas de contrefaçon** : écarter les copies de motifs d’éditeurs connus (de Gournay, Cole &
  Son, Pierre Frey, Zuber, Isidore Leroy, etc.), fréquentes sur AliExpress, et ne jamais
  reprendre les photos ou les textes d’un concurrent (alfmabi, par exemple). Les images du
  fournisseur ne s’utilisent que si celui-ci l’autorise (c’est le cas chez CJ Dropshipping).
- **Qualité avant volume** : pour une marque haut de gamme, recommander de commander un
  échantillon avant toute mise en vente, et le dire dans chaque sélection.

## Ce que l’environnement permet (à vérifier en début de travail)

| Besoin | Outil | État habituel |
|---|---|---|
| Recherche Google, prix, avis, tendances | `WebSearch` | disponible (résultats et extraits, pas de page complète) |
| Lire une page précise (AliExpress, CJ, site concurrent) | `WebFetch`, `curl` | souvent bloqué par la politique réseau de l’environnement |
| API CJ Dropshipping | `curl` + clé API de l’utilisateur | domaine `developers.cjdropshipping.com` à autoriser, clé à fournir en secret d’environnement |
| Créer et modifier des produits | outils `mcp__Shopify__*` (`productSet`) | disponible |
| Relier un produit au fournisseur pour les commandes | application DSers (AliExpress) ou application CJ | à installer par l’utilisateur dans Shopify |

Si une page ou une API est bloquée, le dire en une phrase, indiquer le réglage à changer
(Accès réseau > Domaines autorisés) et continuer avec ce qui marche : recherche Google,
liens et captures envoyés par l’utilisateur. Ne jamais inventer un prix, une note ou un
délai qu’on n’a pas pu lire.

## 1. Veille concurrentielle

Suivre `references/veille-concurrence.md` : liste de concurrents de départ, requêtes types
(français, anglais, espagnol), informations à relever et modèle de rapport. Livrer un
tableau comparatif sourcé, puis trois à cinq recommandations concrètes pour Belle Saison
(prix, collections manquantes, arguments, contenus).

## 2. Sourcing de produits

Suivre `references/sourcing.md` : plateformes (AliExpress, CJ Dropshipping, imprimeurs
européens à la demande), mots-clés, critères de sélection et grille de notation sur 20.
Livrer une présélection courte (5 à 10 produits au plus) sous forme de tableau : produit,
lien, collection Belle Saison visée, coût, délai vers la France, origine, note sur 20,
risques. Calculer le prix de vente conseillé avec `scripts/prix.py` (marge, TVA, frais).

## 3. Import dans Shopify

Suivre `references/import-shopify.md`. En bref :

1. Décrire chaque produit retenu dans un petit fichier JSON (modèle dans la référence).
2. `python3 scripts/fiche_produit.py produit.json > input.json` : le script construit l’entrée
   `productSet` au format du thème (option « Papier », variante « Échantillon A4 », métachamps
   `papier_peint.*`, étiquette de collection, statut brouillon) et signale les erreurs.
3. Créer le produit avec la mutation `productSet` de la référence, via `mcp__Shopify__graphql_mutation`.
4. Vérifier le produit créé, donner son lien d’administration, et rappeler les étapes
   restantes à l’utilisateur : relire, commander un échantillon, relier le produit au
   fournisseur dans DSers ou CJ, puis activer.

Boutique : `v6shfu-w1` (BELLE SAISON, EUR). Lien d’un produit :
`https://admin.shopify.com/store/v6shfu-w1/products/<identifiant numérique>`.

## Fin de chaque travail

Terminer par un récapitulatif court : ce qui a été trouvé ou créé (avec liens), ce qui n’a pas
pu être vérifié et pourquoi, et les décisions qui reviennent à l’utilisateur.
