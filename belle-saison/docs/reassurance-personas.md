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

## Exemples d’avis (modèles, à ne jamais publier comme de vrais avis)

Demandés par la cliente le 15 octobre 2026 comme exemples. Usages possibles : montrer aux
personnes testeuses le genre de retour utile, servir de modèle de ton, illustrer une maquette.
Ils sont fictifs : ne jamais les ajouter dans la section « Avis clients » de la boutique.

| # | Persona | Note | Titre | Avis | Signature fictive |
|---|---|---|---|---|---|
| 1 | Claire | 5 | La couleur exacte, enfin | Je voulais être sûre du vert sauge avant de me lancer. J’ai commandé l’échantillon, je l’ai scotché trois jours près de la fenêtre : c’est exactement la teinte posée aujourd’hui dans notre chambre. | Claire M., Tours, chambre parentale |
| 2 | Claire | 5 | Aucun calcul à faire | Notre mur fait 3,42 m de large avec une poutre : j’ai simplement entré les dimensions et le visuel est arrivé à la bonne taille. Pas une chute, pas un raccord raté. | Sophie L., Angers, salon |
| 3 | Claire | 4 | Posé en un après-midi | Première pose de papier peint pour nous deux. Avec le guide, une brosse et de la patience, c’était fait en un après-midi. Je retire une étoile car j’aurais aimé une vidéo en plus du guide. | Julie et Marc, Nantes, tête de lit |
| 4 | Claire | 5 | Une vraie matière | Je découvrais la marque avec ce premier achat. Le papier est épais, mat, très agréable au toucher, et le colis était soigné. Ce que j’ai reçu ressemble aux gros plans de la fiche. | Anne-Sophie R., Bordeaux, entrée |
| 5 | Léa | 5 | Prête avant la naissance | Je voulais que la chambre soit finie avant mon terme. La date de livraison était affichée avant de payer et elle a été tenue. Les animaux à l’aquarelle sont encore plus doux en vrai. | Léa B., Lille, chambre de bébé |
| 6 | Léa | 5 | Aucune odeur | C’était mon premier critère pour la chambre de notre fils. Aucune odeur le lendemain de la pose, nous avons pu l’installer dans sa chambre tout de suite. | Camille D., Rennes, chambre d’enfant |
| 7 | Léa | 4 | Pensé pour durer, ou pour changer | Le panoramique savane plaît énormément à notre fille. J’ai choisi ce papier aussi parce qu’il se retire à sec : le jour où elle voudra autre chose, nous pourrons changer sans travaux. | Marine T., Lyon, chambre d’enfant |
| 8 | Hélène | 5 | Trois chambres, une seule teinte | Nous avons habillé trois chambres d’amis dans notre longère avec la même toile de Jouy. Tout a été imprimé ensemble : aucune différence de teinte d’une pièce à l’autre. | Hélène G., Dinan, maison de campagne |
| 9 | Hélène | 5 | Une vraie personne au bout du fil | J’aime poser mes questions avant de commander. On m’a répondu le lendemain, avec des conseils précis sur la quantité pour une pièce mansardée. J’ai commandé en toute confiance. | Françoise P., Sarlat, chambre mansardée |
| 10 | Hélène | 5 | Le prix total dès le départ | J’ai fait le calcul pour la salle à manger et le couloir avant de me décider : le prix de chaque mur s’affichait avec la livraison, sans surprise au moment de payer. | Bernard et Hélène V., Honfleur, salle à manger |

### Exemples ajoutés dans la section « Avis clients » (15 octobre 2026)

À la demande de la cliente, les 10 exemples ci-dessus (avec prénom et nom, ville et pièce, date)
et 3 exemples sur le simulateur « Voir sur mon mur » sont enregistrés comme blocs « Avis » de la
section, tous cochés « Exemple » : visibles seulement dans l’éditeur, jamais sur la boutique, et
hors de la note moyenne des visiteurs (`theme/templates/index.json`, blocs `exemple_01` à
`exemple_13`).

| Persona | Note | Titre | Avis | Signature fictive |
|---|---|---|---|---|
| Claire | 5 | Vu sur mon mur avant de commander | J’ai pris notre mur en photo avec le simulateur « Voir sur mon mur » : en deux minutes, je voyais la toile de Jouy dans notre salle à manger. Nous avons choisi à deux, le soir même, sur le canapé. | Élodie Moreau, Poitiers, salle à manger, octobre 2026 |
| Claire | 5 | Le bon motif du premier coup | Avec le simulateur, j’ai essayé trois motifs sur la photo de notre chambre avant de me décider. Une fois posé, le rendu est fidèle à ce que j’avais vu sur l’écran. | Nathalie Fournier, Annecy, chambre, septembre 2026 |
| Léa | 5 | Toute la famille a validé | J’ai envoyé l’image du simulateur à mon mari et à ma mère : tout le monde a vu la chambre de bébé avant même la commande, et nous étions tous d’accord. | Pauline Girard, Strasbourg, chambre de bébé, août 2026 |
