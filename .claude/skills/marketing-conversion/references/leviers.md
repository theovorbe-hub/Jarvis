# Leviers de conversion : mise en place et condition de vérité

Pour chaque technique : ce qu’elle produit, comment la mettre en place dans Shopify, à quelle
condition elle reste honnête, et ce qu’on mesure. Les menus cités sont ceux de l’administration
Shopify en français.

## 1. Rassurer

| Technique | Mise en place | Condition de vérité | Mesure |
|---|---|---|---|
| Engagements sous le bouton d’achat | bloc de texte ou liste d’icônes dans la section produit | chaque engagement existe et figure dans les conditions de vente | conversion de la fiche |
| Date de livraison estimée | calcul en JavaScript : date du jour + délai réel (jours ouvrés) | délai tenu dans la grande majorité des commandes | conversion, questions au service client |
| Paiement sécurisé | icônes `shop.enabled_payment_types` dans le panier et le pied de page | moyens réellement activés (Paramètres > Paiements) | abandon du panier |
| Avis clients | application d’avis (Judge.me…) ou section d’avis du thème | avis réels, badge « vérifié » seulement pour un achat confirmé | conversion des fiches avec avis |
| Photos de clients | galerie, section d’inspiration | accord écrit du client | temps passé, conversion |
| Contact humain | e-mail, téléphone, délai de réponse dans le pied de page et le panier | délai de réponse tenu | questions avant achat |
| Questions fréquentes | section de questions, formulées positivement | réponses exactes | conversion après lecture |
| Échantillon | variante d’échantillon, bouton dédié | envoyé dans le délai annoncé | part des échantillons suivis d’une commande |

## 2. Donner envie

| Technique | Mise en place | Condition de vérité | Mesure |
|---|---|---|---|
| Produit en situation | première image de la fiche = la pièce décorée | photo du vrai produit (une mise en scène doit rester fidèle au rendu réel) | taux de clic depuis les collections |
| Description qui vend | compétence `description-de-produit` | uniquement des données réelles | conversion de la fiche |
| Collections par envie | collections automatiques par étiquette (pièce, ambiance, saison) | | navigation, conversion |
| Nouveautés de saison | collection « Nouveautés », lettre d’information | produits réellement nouveaux | retours sur le site |

## 3. Acheter vite

| Technique | Mise en place | Condition de vérité | Mesure |
|---|---|---|---|
| Paiement express sur la fiche | `{{ form | payment_button }}` dans le formulaire produit | vérifier par une commande test que les propriétés de ligne (personnalisation, dimensions) arrivent dans la commande | part des paiements express |
| Paiement express au panier | `content_for_additional_checkout_buttons` si `additional_checkout_buttons` | | abandon du panier |
| Moyens de paiement | Paramètres > Paiements : Shop Pay, Apple Pay, Google Pay, PayPal | | abandon au paiement |
| Bouton fixe sur mobile | barre d’achat qui apparaît quand le bouton principal sort de l’écran | | conversion mobile |
| Panier latéral | panier qui s’ouvre après l’ajout, avec total et bouton de paiement | | passage au paiement |
| Frais annoncés tôt | frais et seuil de gratuité sur la fiche et dans le panier | montants réels | abandon au paiement |
| Relance de panier abandonné | Marketing > Automatisations (Shopify Email) | un seul rappel sobre, éventuellement un second ; pas de fausse urgence | paniers récupérés |

## 4. Acheter plus

| Technique | Mise en place | Condition de vérité | Mesure |
|---|---|---|---|
| Livraison offerte dès un seuil | Paramètres > Expédition : tarif gratuit selon le montant, ou remise automatique de livraison (`discountAutomaticFreeShippingCreate`) ; barre de progression dans le panier | seuil appliqué automatiquement | panier moyen |
| Remise par quantité | Réductions > Remise automatique, quantité minimale ou montant minimal (`discountAutomaticBasicCreate`, `minimumRequirement`) | remise chiffrée avec `scripts/paliers.py`, affichée telle qu’appliquée | articles par commande, marge |
| Lots et kits | application Shopify Bundles (gratuite) ou produit dédié | prix du lot inférieur à la somme des articles, sinon ne pas parler d’économie | part des lots dans les ventes |
| Produits complémentaires | application Search & Discovery (gratuite) : produits complémentaires ; section de recommandations avec `intent: 'complementary'` | articles réellement utiles ensemble | taux d’ajout |
| Montée en gamme | variantes affichées côte à côte avec la différence de prix et le bénéfice | | part des qualités supérieures |
| Calculateur de quantité | outil sur la fiche qui convertit les mesures en quantité | marge de sécurité justifiée (raccord, coupe), jamais gonflée | erreurs de quantité, réassorts |
| Plusieurs échantillons | variante ou lot « 3 échantillons » | | échantillons suivis d’une commande |
| Cartes cadeaux | Produits > Cartes-cadeaux | | ventes de cartes |
| Offre pour la prochaine commande | code envoyé dans l’e-mail de confirmation | conditions écrites, date de fin respectée | taux de réachat |

## 5. Faire revenir

| Technique | Mise en place | Condition de vérité | Mesure |
|---|---|---|---|
| E-mail de bienvenue | Marketing > Automatisations | | ouverture, première commande |
| E-mail après achat | conseils d’utilisation ou de pose, quelques jours après la livraison | | avis, réachat |
| Demande d’avis | application d’avis, après la livraison | on sollicite tous les clients, pas seulement les satisfaits | nombre d’avis |
| Parrainage | application de parrainage | récompense réelle, conditions claires | nouveaux clients parrainés |

## Urgence et rareté honnêtes

| Situation réelle | Formulation |
|---|---|
| Date limite de livraison pour une fête | « Commandé avant le 10 décembre, livré avant Noël. » |
| Série réellement limitée | « Édition limitée à 50 exemplaires. » (avec le stock réel suivi dans Shopify) |
| Offre avec une date de fin | « Jusqu’au 30 novembre. » (et l’offre s’arrête vraiment ce jour-là) |
| Fabrication à la commande | « Imprimé pour vous, dès votre commande. » |
