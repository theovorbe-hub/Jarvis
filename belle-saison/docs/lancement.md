# Lancement de la boutique

État au 21 octobre 2026, après la remise en ordre du catalogue.

## Ce qui est prêt

- **Catalogue** : 37 papiers peints au rouleau et 23 échantillons, entièrement en français :
  titres, descriptions, choix proposés (« Support : Intissé (TNT) ou Vinyle »), types de produit,
  étiquettes et adresses des pages (`/products/papier-peint-…`, `/products/echantillon-…`, les
  anciennes adresses en espagnol redirigent vers les nouvelles).
- **Échantillons reliés** : chaque rouleau qui a un échantillon le désigne dans le métachamp
  `papier_peint.echantillon` ; la fiche produit affiche « Commander un échantillon (4,90 €) ».
- **Collections publiées** sur la boutique en ligne (elles ne l’étaient pas) : Les essentiels,
  Les motifs, La collection enfant, et trois nouvelles collections automatiques : Fleurs et
  feuillages (étiquettes `fleurs`, `feuillages`), Les rayures (`rayures`), Vichy et carreaux
  (`vichy`, `carreaux`). Aussi : Tous nos papiers peints (type « Papier peint ») et Les
  échantillons (type « Échantillon »). Les paysages, Les toiles et les collections de
  panoramiques restent non publiées tant qu’elles sont vides.
- **Menus** : `menu-horizon` (Collections, Papiers peints, Échantillons, Nos engagements),
  `menu-aide-horizon` (Contact, Mes favoris, Rechercher). Page « Nos engagements » rédigée et
  publiée.
- **Thème « Horizon · Belle Saison »** (non publié) : engagements exacts partout (livraison
  offerte dès 65 €, échantillon grand format, éditeurs européens, paiement sécurisé), bandeau
  d’annonces affiché, vente au rouleau avec calculateur du nombre de rouleaux.
- **« Voir sur mon mur »** : 23 papiers peints au rouleau (et leurs échantillons) ont leur motif
  à plat (`papier_peint.visuel`, la photo de l’échantillon, largeur 53 cm) : le simulateur
  s’affiche sur leur fiche. Dans le simulateur, une rangée de vignettes permet d’essayer les
  autres papiers peints de « Tous nos papiers peints » sans quitter sa photo, avec un lien
  « Voir ce papier peint » vers la fiche.
  Pas encore de simulateur (aucune photo du motif à plat) : Étoiles Gris Doux, Fleurs des Prés,
  Les Petits Trésors de l’Océan, Cadenza Petite, Héritage Fleuri, Étoiles Beige Grisé,
  Étoiles Gris & Blanc, Vichy Grège, Bouquets de Charme, Brindilles Lin Bleu, Carreaux Rubis,
  Sienne Textile, Tennis. Pour l’ajouter : demander au fournisseur l’image du motif à plat
  (fichier d’impression ou scan d’un lé), l’envoyer dans Contenu > Fichiers et la choisir dans
  le métachamp « Visuel à plat » du produit (largeur du motif : 53 cm).
  Pour Lin Gris Patiné, Lin Doré et Les Petites Fleurettes, le simulateur montre le motif de
  l’échantillon (Lin ivoire, Lin doré, Confettis) : c’est le papier livré, à comparer avec la
  photo de la fiche (point 1 ci-dessous).

## À faire par la cliente avant d’ouvrir

1. **Vérifier les photos de 11 produits.** Leurs photos d’origine ont été remplacées par des
   visuels créés par une IA, et leurs noms ou leurs couleurs ont changé. Le client doit recevoir
   exactement le papier peint montré : comparer chaque fiche avec la référence du fournisseur et
   remettre la photo du fournisseur si le motif ou la couleur diffère.
   Les échantillons de ces produits montrent encore la photo d’origine.

   | Fiche actuelle | Nom d’origine du fournisseur |
   |---|---|
   | Étoiles Gris Doux | Estrellas tonos pastel |
   | Fleurs des Prés | Flores del campo |
   | Les Petits Trésors de l’Océan | Fondo marino |
   | Cadenza Petite | Cadenza Petite |
   | Héritage Fleuri | Cologne gris (motif géométrique) |
   | Les Petites Fleurettes | Confetti verde (petits pois) |
   | Étoiles Gris & Blanc | Estrellas tonos verde |
   | Vichy Grège | Beige tartan (écossais) |
   | Bouquets de Charme | Hojas (feuilles) |
   | Lin Gris Patiné | Lino avorio (lin ivoire) |
   | Lin Doré | Lino dorato |

2. **Pages légales** (Paramètres > Politiques). Seule la politique de confidentialité existe.
   Créer à partir des modèles Shopify, puis vérifier les points ci-dessous :
   - **Conditions générales de vente** et **mentions légales** : raison sociale ou nom,
     forme juridique, numéro SIRET, adresse (Chemin de Gabach, 82230 Léojac), e-mail et
     téléphone, hébergeur (Shopify).
   - **Retours** : droit de rétractation de 14 jours après réception, sauf les papiers peints
     fabriqués aux dimensions du client (panoramiques sur mesure) ; frais de retour à la charge
     du client s’ils sont annoncés ; remboursement sous 14 jours, frais de livraison standard
     compris ; adresse de retour communiquée par e-mail. Les échantillons sont des produits
     comme les autres : l’étiquette `if-non-returnable` ne supprime pas ce droit.
   - **Livraison** : France uniquement ; standard 7,99 €, offerte dès 65 € ; express 10,99 € ;
     **délai réel de préparation et de livraison des rouleaux à confirmer avec les fournisseurs**
     (obligatoire avant l’achat ; les échantillons indiquent 1 à 5 jours ouvrés de préparation).
3. **Paiements** : vérifier que Shopify Payments (ou un autre moyen) est activé et testé
   (Paramètres > Paiements), puis passer une commande test.
4. **Logo** : Personnaliser > Réglages du thème > Logo.
5. **Publier le thème** « Horizon · Belle Saison » (Boutique en ligne > Thèmes > Publier).
6. **Retirer le mot de passe** (Boutique en ligne > Préférences > Accès restreint).

## Recommandations pour vendre plus (à valider)

- **Échantillon déduit de la commande** : rembourser le prix de l’échantillon sous forme de code
  de réduction sur la commande de rouleaux. Levier fort pour cette catégorie, à valider avant
  création (remise).
- **Adresse e-mail professionnelle** (par exemple bonjour@ votre domaine) et **nom de domaine**
  Belle Saison : la boutique utilise encore `v6shfu-w1.myshopify.com` et une adresse Gmail.
- **Panoramiques** : 6 produits en brouillon (en préparation) ; à publier avec le métachamp
  `papier_peint.mode_vente` = `m2` pour activer le configurateur sur mesure.
