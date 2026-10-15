# Rassurer chaque persona sans faux avis

Version du 15 octobre 2026. La cliente a demandé 10 avis écrits pour les peurs de chaque
persona. La boutique n’a encore aucune vente : des avis écrits par la marque seraient de faux
avis, interdits (Code de la consommation, articles L121-2 à L121-4 ; jusqu’à 300 000 €
d’amende, article L132-2). Ce document donne l’alternative qui produit le même effet : des
engagements affirmés là où le client décide, puis une méthode pour obtenir vite de vrais avis
qui parlent de ces mêmes sujets.

Règle de la marque : on rassure en affirmant, jamais en nommant la peur (aucun « Et si… ? »).
Textes contrôlés par `controle_confiance.py` : 0 signalement.

## 10 engagements, persona par persona

Chaque phrase ne se publie que si sa condition est vraie (colonne de droite).

| Persona | Ce qu’elle se demande (jamais écrit sur le site) | Texte à afficher | Où | Condition avant publication |
|---|---|---|---|---|
| Claire | La couleur sera-t-elle la même qu’à l’écran ? | Choisissez votre teinte chez vous, dans la lumière de votre pièce : l’échantillon A4 est offert. | fiche produit, sous le bouton | échantillon A4 réellement envoyé gratuitement |
| Claire | Vais-je bien mesurer ? | Indiquez la largeur et la hauteur de votre mur : nous calculons la surface et adaptons le visuel, sans surcoût. | fiche produit, au-dessus du configurateur | déjà vrai dans le thème |
| Claire | Vais-je réussir la pose ? | L’intissé s’encolle directement sur le mur et se pose lé après lé, en un samedi : chaque commande est accompagnée de son guide de pose. | fiche produit, e-mail de confirmation | guide de pose rédigé ; support intissé à encoller confirmé par le fournisseur |
| Claire | Est-ce de la qualité, sur un site que je ne connais pas ? | Chaque fiche montre la matière en gros plan et indique son grammage : vous savez exactement ce que vous recevez. | fiche produit, accueil | gros plan et grammage réels sur chaque fiche |
| Claire, Léa | Quand vais-je le recevoir ? | Livré entre le 22 et le 24 octobre : la date de livraison s’affiche avant le paiement. | fiche produit, panier | date calculée sur le délai réel du fournisseur (exemple de dates à remplacer) |
| Claire, Hélène | Combien cela coûte au total ? | Le prix de votre mur s’affiche dès que vous saisissez ses dimensions, frais de livraison compris. | fiche produit | frais de port fixés et affichés sur la fiche |
| Léa | Pourrai-je l’enlever quand l’enfant grandira ? | Il se retire à sec, en un seul morceau, le jour où la chambre grandit avec votre enfant. | fiches de la collection enfant | intissé pelable à sec confirmé par le fournisseur |
| Léa | Est-ce sain pour une chambre de bébé ? | Imprimé avec des encres à l’eau, sans odeur une fois posé : la chambre de bébé est prête dès le lendemain. | fiches de la collection enfant | encres à l’eau confirmées par écrit par le fournisseur |
| Hélène | Les teintes seront-elles les mêmes dans toutes les pièces ? | Toutes les pièces d’une même commande sont imprimées ensemble : les teintes restent identiques d’un mur à l’autre. | panier, fiches au rouleau | impression groupée confirmée par le fournisseur |
| Hélène | Puis-je parler à quelqu’un avant de commander ? | Écrivez-nous à bonjour@belle-saison.fr : une conseillère vous répond sous 24 heures ouvrées, du lundi au vendredi. | pied de page, fiche produit, page contact | adresse réelle (exemple à remplacer) et délai de réponse tenu |

## Obtenir de vrais avis qui disent la même chose

### Les 10 premiers avis, avant les premières ventes

Offrir un échantillon ou un petit mur à une dizaine de personnes qui ressemblent aux personas
(maison ancienne en rénovation, chambre de bébé, maison de campagne), contre un avis honnête,
bon ou mauvais. Ces avis sont légaux s’ils sont signalés : mention « Produit offert » à côté de
l’avis, et jamais la case « Avis vérifié » (réservée aux achats). Le thème n’a pas encore de
champ « Produit offert » : à ajouter à la section « Avis clients » avant de publier ces avis.

### Après chaque commande : l’e-mail de demande d’avis

Envoyé 5 jours après la livraison (application d’avis comme Judge.me, ou Shopify Email). Les
questions guident le client vers les sujets qui rassurent les suivants, sans lui souffler la
réponse.

> Objet : Votre mur Belle Saison
>
> Bonjour [prénom],
>
> Votre papier peint est arrivé il y a quelques jours. Nous serions heureux de savoir comment
> s’est passée la suite, en quelques lignes :
>
> - Pour quelle pièce l’avez-vous choisi ?
> - Comment s’est passée la pose ?
> - Le rendu chez vous ressemble-t-il aux photos du site ?
> - La livraison est-elle arrivée à la date annoncée ?
>
> Une photo de votre mur aide beaucoup les prochaines clientes à se projeter. Nous ne la
> publions qu’avec votre accord.
>
> Merci, et belle saison dans votre nouvelle pièce.
>
> [signature]

Publication : tous les avis, y compris les moins bons (répondre poliment à chacun) ; « Avis
vérifié » coché seulement pour un achat confirmé ; indiquer sous la section comment les avis
sont collectés (obligation d’information, article L111-7-2).
