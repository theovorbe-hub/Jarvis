# Import des produits dans Shopify

But : créer un produit retenu dans la boutique `v6shfu-w1`, au format attendu par le thème
Belle Saison, **en brouillon**, prêt à être relu par l’utilisateur.

## 1. Décrire le produit (fichier JSON)

```json
{
  "titre": "Papier peint Rayure lin sauge",
  "description_html": "<p>Une rayure fine sur un fond de lin naturel…</p>",
  "collection": "essentiels",
  "etiquettes": ["rayures", "lin"],
  "mode_vente": "m2",
  "qualites": [
    { "nom": "Intissé premium", "prix": 79, "cout": 12.4, "sku": "BS-RAYLIN-INT" },
    { "nom": "Intissé lessivable", "prix": 89, "cout": 14.9, "sku": "BS-RAYLIN-LES" }
  ],
  "echantillon": { "prix": 0, "cout": 1.8 },
  "images": [
    { "url": "https://…/photo-1.jpg", "alt": "Chambre tapissée d’une rayure lin sauge" }
  ],
  "metachamps": {
    "matiere": "Intissé premium 190 g/m²",
    "pose": "Encollage du mur",
    "entretien": "Lessivable",
    "raccord": 0,
    "type_raccord": "Sans raccord"
  },
  "seo": { "titre": "Papier peint rayure lin sauge sur mesure", "description": "…" },
  "fournisseur": { "plateforme": "CJ Dropshipping", "url": "https://…", "reference": "CJ123" }
}
```

- `description_html` et `seo` : rédigés avec la compétence `description-de-produit` (structure
  en 6 blocs, adaptée à Belle Saison), puis contrôlés avec son script `verifier_fiche.py`.
- `collection` : `essentiels`, `motifs`, `paysages`, `toiles` ou `enfant` (devient l’étiquette).
- `mode_vente` : `m2` (prix des qualités = prix au m²) ou `rouleau` (prix d’un rouleau ; ajouter
  alors `largeur_le` en cm et `longueur_rouleau` en m dans `metachamps`).
- `echantillon` : `null` pour ne pas proposer d’échantillon.
- `cout` : coût d’achat livré, enregistré dans Shopify pour suivre la marge.
- `fournisseur` : enregistré dans des métachamps `sourcing.*`, invisibles sur le site.
- Textes en français, apostrophe ’, sans tiret cadratin. Le script corrige les apostrophes
  droites et signale le reste.

## 2. Construire l’entrée Shopify

```bash
python3 scripts/fiche_produit.py produit.json > input.json
```

Le script vérifie le fichier (collection, mode de vente, prix supérieurs aux coûts, images,
longueurs SEO) et écrit l’objet `{"input": …}` à passer tel quel en variables. En cas d’erreur,
il l’explique et s’arrête.

## 3. Créer le produit

Mutation validée sur le schéma Admin (`productSet`, création synchrone) :

```graphql
mutation CreerProduit($input: ProductSetInput!) {
  productSet(input: $input, synchronous: true) {
    product {
      id
      handle
      status
      variants(first: 10) { nodes { id title price sku } }
    }
    userErrors { field message code }
  }
}
```

Appeler `mcp__Shopify__graphql_mutation` avec cette requête et le contenu de `input.json` comme
variables. Si `userErrors` n’est pas vide, corriger le fichier JSON et recommencer.

À savoir :

- `productSet` remplace les listes (variantes, métachamps, images) : pour modifier un produit
  existant, repartir de toutes ses données, pas d’un extrait.
- Les images sont téléchargées par Shopify depuis leur adresse (`originalSource`) ; elles
  doivent être publiques. Préférer les photos d’ambiance à fond neutre, sans filigrane.
- Le statut reste `DRAFT`. Ne pas activer ni publier sans l’accord explicite de l’utilisateur :
  la boutique en ligne actuelle (thème Horizon) afficherait le produit aussitôt.

## 4. Vérifier et passer la main

1. Relire le produit (`product(id:)` : titre, variantes, prix, étiquettes, métachamps, images).
2. Donner le lien : `https://admin.shopify.com/store/v6shfu-w1/products/<identifiant numérique>`.
3. Rappeler à l’utilisateur ce qui reste à faire de son côté :
   - commander un échantillon et vérifier les couleurs ;
   - **relier le produit au fournisseur** pour que les commandes partent : application DSers
     (AliExpress) ou application CJ Dropshipping, fonction de liaison d’un produit existant
     (« mapping » ou « connect ») ; pour le sur-mesure, transmettre les dimensions du mur au
     fournisseur à chaque commande (elles figurent dans la commande Shopify) ;
   - activer le produit quand tout est prêt.

## Importer par l’application du fournisseur (autre voie)

DSers et l’application CJ peuvent aussi créer eux-mêmes les produits dans Shopify. Dans ce cas,
reprendre ensuite chaque produit importé pour l’adapter à Belle Saison : titre et description
en français, étiquette de collection, option « Papier », variante « Échantillon A4 »,
métachamps `papier_peint.*`, prix conseillé.
