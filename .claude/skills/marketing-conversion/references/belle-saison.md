# Adaptation au projet Belle Saison

Boutique Shopify `v6shfu-w1` de papiers peints d’exception, thème « Belle Saison » (fichiers
dans `belle-saison/theme/`). Typologie : **luxe, décoration**. On pousse à l’achat par le
service, la projection et des offres élégantes, jamais par la pression.

## Clientèle

Lire `belle-saison/docs/persona.md` avant tout audit ou toute offre : persona principal (Claire,
41 ans, propriétaire d’une maison ancienne, style campagne chic, décide à deux, découvre sur
mobile le soir, budget de 250 à 600 € par mur), personas secondaires (Léa, chambre d’enfant ;
Hélène, plusieurs pièces de maison de campagne ; professionnelles), anti-persona, et la liste
des adaptations du site classées « fait », « thème » ou « décision ».

## Ton des offres

- Vouvoiement, phrases courtes et calmes, pas de point d’exclamation, pas d’emoji, pas de
  majuscules pour crier, apostrophe typographique (’), aucun tiret cadratin ni demi-cadratin.
- Exemples : « Livraison offerte dès 300 € » · « 10 % dès 20 m², appliqués automatiquement » ·
  « Trois échantillons offerts pour comparer chez vous » · « Offrez un mur : la carte cadeau ».
- La cliente ne veut **aucune formulation qui fasse douter** : la section de questions
  (« Ce qui pourrait vous faire hésiter ») a été retirée de l’accueil à sa demande. Toujours
  affirmer l’engagement, jamais nommer la peur.

## Engagements réels (les seuls à afficher)

- Livraison sous 5 à 7 jours en France et en Europe.
- Échantillon A4 offert.
- Sur-mesure inclus : le visuel est adapté au mur, sans surcoût.
- Impression européenne sur supports haut de gamme ; matériaux respectueux de l’intérieur.

À ne pas promettre sans confirmation : garantie, retours gratuits, « satisfait ou remboursé »
(le sur-mesure est exclu du droit de rétractation), délai plus court, livraison offerte.

## Modes de vente et quantités

| Mode | Quantité au panier | Conséquence pour les offres |
|---|---|---|
| Sur mesure au m² | surface du mur arrondie au m² entamé, non modifiable dans le panier ; dimensions enregistrées en propriétés de ligne | une remise « par quantité » Shopify compte des m² : formuler « dès 20 m² » ou « dès 500 € », pas « dès 2 murs » |
| Au rouleau | nombre de rouleaux donné par le calculateur | un rouleau de réserve n’est conseillé que si l’imprimeur confirme des écarts de teinte entre deux tirages |
| Échantillon A4 | 1 par motif, offert | lot de trois échantillons possible si la cliente accepte le coût d’envoi |

Pousser à commander plusieurs murs ou pièces : remise au m² ou au montant, collection
« chambre d’enfant » associée à la chambre des parents, kit de pose (colle, brosse, spatule)
s’il est sourcé (compétence `veille-sourcing-belle-saison`).

## Ce que le thème fait déjà (12 octobre 2026)

- Fiche produit : configurateur largeur × hauteur, calculateur de rouleaux, bouton
  d’échantillon, engagements sous le bouton d’achat (bloc « Réassurance » : échantillon offert,
  adaptation sur mesure incluse, livraison sous 5 à 7 jours), tableau de caractéristiques,
  favoris, recommandations de produits.
- Ajout au panier : court message de confirmation, pas de panier latéral.
- Paiement express : présent dans le panier (`content_for_additional_checkout_buttons`),
  absent de la fiche produit. Avant de l’ajouter à la fiche d’un produit sur mesure, passer une
  commande test et vérifier que « Largeur du mur », « Hauteur du mur » et « Surface » arrivent
  dans la commande ; sinon le réserver aux produits au rouleau.
- Pas de barre de livraison offerte, pas de produits complémentaires dans le panier, pas de
  bouton d’achat fixe sur mobile.
- Accueil : bandeau d’engagements, avis clients réels (section invisible tant qu’elle est vide).
- La boutique n’a encore ni produit ni vente : pas de panier moyen mesuré. Fixer les seuils à
  partir des prix (commande type d’environ 10 m²) puis les réajuster après les premières ventes.

## Plan conseillé

| Priorité | Action | Effort | Décision de la cliente |
|---|---|---|---|
| 1 | Date de livraison estimée sous le bouton d’achat (les engagements y sont déjà) | thème | non |
| 2 | Panier latéral avec paiement express | thème | non |
| 3 | Barre « livraison offerte dès … » dans le panier | thème + réglage d’expédition | seuil et frais de port |
| 4 | Bouton d’achat fixe sur mobile | thème | non |
| 5 | Paiement express sur la fiche produit | thème + commande test | non |
| 6 | Remise « dès 20 m² » ou « dès 500 € » | remise automatique | taux et seuil (chiffrés avec `paliers.py`) |
| 7 | Kit de pose en produit complémentaire | sourcing + Search & Discovery | choix du kit et prix |
| 8 | Trois échantillons offerts | variante ou lot | coût accepté |
| 9 | Carte cadeau « Offrir un mur » | Produits > Cartes-cadeaux | montants |
| 10 | Relance de panier, e-mail après livraison (conseils de pose, demande d’avis) | Shopify Email | textes |
