# Adaptation au projet Belle Saison

Boutique Shopify `v6shfu-w1` de papiers peints d’exception. Typologie : **luxe, décoration**.

## Ton

- Vouvoiement, phrases calmes et sensorielles, vocabulaire de la maison et de la matière :
  lumière, lin, intissé, motif, mur, pièce, maison de caractère, maison de famille, saison.
- Pas de point d’exclamation, pas d’emoji, pas de superlatif creux (« incroyable »,
  « must-have », « le meilleur »), pas d’anglicisme.
- Français uniquement, apostrophe typographique (’), aucun tiret cadratin ni demi-cadratin ;
  séparer les éléments d’une ligne par « · » ou par des virgules.
- Parler de la pièce et de l’ambiance avant de parler du papier.

## Pour qui (bloc 04)

Écrire pour l’un des personas de `belle-saison/docs/persona.md` : Claire (maison ancienne
rénovée pièce par pièce, chambre parentale ou salon, style campagne chic), Léa (chambre
d’enfant, panoramique doux) ou Hélène (maison de campagne, plusieurs pièces, goûts classiques).
Nommer la pièce et l’ambiance, jamais l’âge ni le revenu.

## Désirs et problèmes du client (pour l’accroche)

- Un mur blanc sans caractère, une pièce qui manque de chaleur ou de personnalité.
- L’envie d’une maison qui raconte une histoire, d’un intérieur « habité » et intemporel.
- Le désir de trouver la couleur ou le motif juste (d’où l’échantillon offert).
- Un mur aux dimensions atypiques (d’où le sur-mesure).

L’accroche part d’un manque dans la pièce, jamais d’une peur liée à l’achat (se tromper, être
déçu, hésiter) : la cliente ne veut aucun texte qui fasse douter.

## Données du produit dans Shopify

| Donnée | Où la trouver |
|---|---|
| Mode de vente : sur mesure au m² ou au rouleau | métachamp `papier_peint.mode_vente` (`m2` ou `rouleau`) |
| Qualités de papier et prix | option « Papier » et ses variantes (prix au m² ou au rouleau) |
| Échantillon | variante « Échantillon A4 » (offerte si son prix est 0) |
| Support | `papier_peint.matiere` (ex. « Intissé premium 190 g/m² ») |
| Pose | `papier_peint.pose` (ex. « Encollage du mur ») |
| Entretien | `papier_peint.entretien` (ex. « Lessivable ») |
| Lé et rouleau | `papier_peint.largeur_le` (cm), `papier_peint.longueur_rouleau` (m) |
| Raccord | `papier_peint.raccord` (cm), `papier_peint.type_raccord` |
| Collection | étiquette : `essentiels`, `motifs`, `paysages`, `toiles`, `enfant` |

La page produit affiche déjà un tableau de caractéristiques à partir de ces métachamps : le
bloc 05 de la description doit dire la même chose, en plus court.

## Engagements affichés sur le site (réassurance)

- Livraison sous 5 à 7 jours en France et en Europe.
- Échantillon offert.
- Sur-mesure inclus : le visuel est adapté au mur, sans surcoût.

À ne pas promettre sans confirmation de l’utilisatrice : une garantie, des retours gratuits.
Attention, un papier peint fabriqué aux dimensions du client n’ouvre pas droit au délai de
rétractation de 14 jours (bien confectionné selon les spécifications du consommateur) : ne pas
écrire « satisfait ou remboursé » pour le sur-mesure. Ligne de réassurance type :
« Livraison sous 5 à 7 jours en France et en Europe · Échantillon offert · Fabriqué à vos
mesures ».

## Raisons d’agir maintenant (vraies)

- L’échantillon est offert : le voir chez soi, dans sa propre lumière, avant de décider.
- Chaque commande est imprimée à la demande, aux dimensions du mur.
- La saison : refaire une chambre avant l’automne, un salon avant les fêtes (si c’est le cas).

## Exemple (données d’exemple, à remplacer par celles du produit réel)

```
01 HOOK : Une chambre peut être claire et sans âme : il manque souvent un mur qui donne le ton.
02 PROMESSE : Ce papier peint pose une rayure douce et régulière qui réchauffe la pièce, rend
   les murs plus hauts et donne à la chambre le calme d’une maison de famille.
03 ARGUMENTS :
- **Une pièce qui paraît plus haute** : la rayure verticale étire le regard du sol au plafond.
- **Un mur sans défaut visible** : l’intissé épais masque les petites irrégularités du support.
- **Aucune chute ni calcul** : le papier est imprimé aux dimensions exactes de votre mur.
- **Une couleur choisie chez vous** : l’échantillon offert se compare à vos tissus et à votre
  lumière.
04 POUR QUI : Pour qui veut une chambre apaisante, dans l’esprit d’une maison de campagne, sans
   motif chargé ni couleur trop franche.
05 SPECS :
- Intissé premium 190 g/m², lessivable
- Sur mesure, vendu au m²
- Pose : encollage du mur
- Sans raccord
06 RÉASSURANCE : Livraison sous 5 à 7 jours en France et en Europe · Échantillon offert ·
   Fabriqué à vos mesures
   CTA : Commandez votre échantillon offert et voyez la rayure dans votre lumière, avant de
   tapisser.
À compléter : rien
```
