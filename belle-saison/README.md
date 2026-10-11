# Belle Saison - thème Shopify

Thème Shopify sur mesure pour **Belle Saison**, boutique de papiers peints d’exception.
Il reprend l’identité de la maquette [`docs/maquette.png`](docs/maquette.png) : fond crème,
vert forêt, Garamond pour les titres et le texte, petites capitales Geist pour les
boutons et les surtitres.

## La boutique

| | |
|---|---|
| Boutique | BELLE SAISON (`v6shfu-w1.myshopify.com`) |
| Thème | « Belle Saison », non publié, ID `211492798855` |
| Éditeur | https://admin.shopify.com/store/v6shfu-w1/themes/211492798855/editor |
| Aperçu | https://v6shfu-w1.myshopify.com/?preview_theme_id=211492798855 |

Le thème en ligne reste Horizon tant que « Belle Saison » n’est pas publié
(Boutique en ligne > Thèmes > Publier).

## Contenu du dossier

```
belle-saison/
├── theme/        Le thème Shopify (dossiers standard d'un thème Online Store 2.0)
├── tools/        Validation, aperçu local, tests et fabrication des vidéos
├── media/        Photos des vidéos et leurs cartes de profondeur
└── docs/         Maquette de référence
```

Dans `theme/` :

- `sections/` : en-tête, bandeau d’arguments, ouverture en diaporama, engagements,
  liste de collections, « Notre histoire », produits mis en avant, vidéo plein écran,
  inspiration, lettre d’information, pied de page, et les pages (produit, collection,
  panier, recherche, journal, contact, favoris, mot de passe).
- `snippets/` : carte produit, prix, caractéristiques, filtres, icônes
  ([Phosphor](https://phosphoricons.com), licence MIT).
- `assets/base.css` et `assets/theme.js` : styles et comportements, sans dépendance externe.
- `locales/fr.default.json` : tous les textes de l’interface.

## Comment la boutique vend

Chaque produit est vendu **sur mesure au m²** (par défaut) ou **au rouleau**. Le
métachamp `papier_peint.mode_vente` choisit le mode, produit par produit.

**Sur mesure (m²).** Chaque variante est une qualité de papier, et son prix est le
prix au m². Le client saisit la largeur et la hauteur de son mur. Le thème calcule
la surface, l’arrondit au m² entamé (c’est la quantité ajoutée au panier) et
enregistre les dimensions dans la commande (« Largeur du mur », « Hauteur du mur »,
« Surface »). Dans le panier, la quantité de ces lignes n’est pas modifiable.

**Au rouleau.** Le prix de la variante est le prix d’un rouleau. Un calculateur
donne le nombre de rouleaux à partir de la largeur des murs, de la hauteur sous
plafond, de la largeur du lé, de la longueur du rouleau et du raccord.

**Échantillon.** Toute variante dont le nom contient « Échantillon » est traitée
comme un échantillon : elle disparaît du choix du papier et devient le bouton
« Commander un échantillon offert » (ou payant si son prix n’est pas 0).

### Créer un produit

1. Option « Papier » : une valeur par qualité (ex. « Intissé premium »), au prix du m²,
   plus une valeur « Échantillon A4 » à 0 €.
2. Désactiver le suivi de stock (fabrication à la demande).
3. Ajouter une étiquette pour la collection : `essentiels`, `motifs`, `paysages`,
   `toiles` ou `enfant`.
4. Remplir les métachamps « papier_peint » :

| Clé | Type | Utilisation |
|---|---|---|
| `mode_vente` | texte (`m2` ou `rouleau`) | Mode de vente. Vide = réglage du thème |
| `matiere` | texte | Support, ex. « Intissé premium 190 g/m² » |
| `pose` | texte | ex. « Encollage du mur » |
| `entretien` | texte | ex. « Lessivable » |
| `largeur_le` | décimal (cm) | Rouleau : largeur du lé |
| `longueur_rouleau` | décimal (m) | Rouleau : longueur |
| `raccord` | décimal (cm) | Hauteur du raccord, masqué si 0 |
| `type_raccord` | texte | Raccord droit, sauté ou sans raccord |

## Vidéos

La section **« Ouverture vidéo »** ouvre l’accueil : l’image de couverture s’affiche
immédiatement, puis la vidéo (version ordinateur ou verticale selon l’écran, dans la taille
adaptée) apparaît en fondu, muette et en boucle. Elle n’est pas chargée pour les visiteurs
qui réduisent les animations ou économisent leurs données, et l’image reste en place si la
lecture échoue. Sur ordinateur, c’est un montage en 4 plans (salon, mur tapissé, gros plan
sur le motif, chambre) ; sur mobile, une boucle sur la photo du salon. Les deux ont un rendu
« film » : relief grâce à une carte de profondeur, bascules de point, étalonnage pellicule,
halo des lumières et grain. Pour refaire les vidéos (numpy, Pillow, opencv-python-headless
et ffmpeg) :

```bash
python3 tools/make-hero-video.py montage sortie/   # ordinateur, 4 plans
python3 tools/make-hero-video.py boucle sortie/    # salon seul : ordinateur et mobile
```

Le détail des plans, des réglages et des fichiers est dans [`docs/videos.md`](docs/videos.md).

La section « Ouverture » (diaporama d’images), « Notre histoire » et la section « Vidéo plein écran » acceptent aussi une vidéo
d’ambiance hébergée sur Shopify (Contenu > Fichiers). Elle se lance sans son et en boucle
quand elle est visible, avec un bouton pause, et reste à l’arrêt pour les visiteurs qui
réduisent les animations. La section « Vidéo plein écran » n’apparaît sur la boutique
qu’une fois une vidéo choisie. Le plan des vidéos à produire, avec les consignes pour un
générateur vidéo, est dans [`docs/videos.md`](docs/videos.md).

## Ce qui a été créé dans la boutique

- **Collections automatiques** (selon l’étiquette) : Les essentiels, Les motifs,
  Les paysages, Les toiles, La collection enfant.
- **Menus** : `menu-gauche` (Collections, Papiers peints, Inspiration) et
  `menu-droite` (Notre histoire, Nos engagements). Le menu `main-menu` d’Horizon
  n’a pas été modifié.
- **Pages** : « Mes favoris » (modèle `page.favoris`), « Notre histoire » et
  « Nos engagements » (non publiées, à rédiger).
- **Journal** : « Inspiration ».
- **Définitions de métachamps** `papier_peint.*` listées ci-dessus.

## Outils

```bash
cd belle-saison/tools
npm install
npm run check            # Shopify Theme Check : doit afficher 0 problème
npm run preview:images   # une fois : images d'aperçu (Pillow) et vidéo de démo (ffmpeg)
npm run preview          # rendu local + captures dans tools/preview-out/
npm test                 # teste le configurateur, le calculateur et les vidéos
npm run zip              # crée belle-saison/belle-saison-theme.zip
```

L’aperçu local imite Shopify avec [liquidjs](https://liquidjs.com) et des données
fictives : il sert à contrôler la mise en page, pas à remplacer l’aperçu Shopify.

## Mettre à jour le thème dans Shopify

Les images et les textes changés dans l’éditeur Shopify sont enregistrés dans
`config/settings_data.json`, `templates/*.json` et `sections/*-group.json` **côté
Shopify**. Avant d’envoyer ces fichiers, récupérez la version de la boutique, sinon
les réglages faits dans l’éditeur seront écrasés.

- **Shopify CLI** :
  `shopify theme pull --theme 211492798855 --path belle-saison/theme`
  puis `shopify theme push --theme 211492798855 --path belle-saison/theme`.
- **Archive** : `npm run zip`, puis Boutique en ligne > Thèmes > Ajouter un thème >
  Importer un fichier zip (crée un nouveau thème).

## Avant d’ouvrir la boutique

- Ajouter les photos (ouverture, histoire, inspiration, images des collections) et,
  si besoin, le logo dans l’éditeur.
- Créer les produits, rédiger et publier « Notre histoire » et « Nos engagements ».
- Vérifier les arguments repris de la maquette (« Impression européenne haut de
  gamme », « Livraison sous 5 à 7 jours », « Échantillon offert »).
- Publier le thème.
