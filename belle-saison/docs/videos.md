# Plan vidéo Belle Saison

Le luxe d’un papier peint se voit surtout dans **la lumière qui glisse sur la matière**,
**le geste** et **l’échelle d’une pièce entière**. Les vidéos du site doivent donc être
lentes, silencieuses et sans texte incrusté : le site porte déjà les mots.

## Vidéo d’ouverture (en ligne dans le thème)

Section « Ouverture vidéo », en tête de l’accueil. Les vidéos sont produites avec
`tools/make-hero-video.py`, sans IA générative : une caméra virtuelle se déplace très
lentement dans de vraies photos. Motifs, couleurs et mobilier restent ceux des photos.

### Le rendu « film »

- **Profondeur.** Une carte de profondeur par photo (`media/profondeur/`, calculée avec le
  modèle Depth Anything V2 Small) fait glisser les premiers plans plus vite que le fond et
  grossir ce qui est proche quand la caméra avance : la pièce prend du relief.
- **Mise au point.** Profondeur de champ réduite, avec deux bascules de point : du bouquet
  au mur de toile (plan 2), puis sur le motif du papier peint (plan 3).
- **Image pellicule.** Noirs veloutés tirant vers le vert forêt, hautes lumières ambrées,
  diffusion douce des lumières, halo chaud autour des fenêtres et des bougies, vignettage,
  grain fin, 24 images par seconde.
- **Caméra portée.** Un flottement à peine perceptible, comme sur un stabilisateur.

Les réglages sont en tête du script (`LOOK`, `MONTAGE`, `KEYS_DESKTOP`, `KEYS_MOBILE`).

### Montage en 4 plans (ordinateur, en ligne)

À partir de `media/salon-ouverture-source.jpg` et des trois photos `media/montage-*.png`
(découpées dans `media/bandes-salon-detail-chambre.png`), 20 s en boucle :

| Plan | Temps | Image | Mouvement |
|---|---|---|---|
| 1 | 0 à 5,75 s | le salon, vue d’ensemble | travelling avant vers la porte-fenêtre |
| 2 | 4,75 à 10,5 s | le salon au mur tapissé de toile | glissement latéral, le point passe du bouquet au mur |
| 3 | 9,5 à 15,25 s | le papier peint feuillage | gros plan, le motif devient net |
| 4 | 14,25 à 20 s | la chambre | recul lent, puis fondu vers la première image |

Les trois photos des plans 2 à 4 n’existent qu’en petite taille (1672 px de large, 265 à
356 px de haut) : agrandies pour la vidéo, elles sont plus douces que le premier plan (le
grain et la profondeur de champ l’atténuent). Avec les photos d’origine en pleine
résolution, le montage sera net d’un bout à l’autre : remplacer les fichiers
`media/montage-*.png`, recalculer leur profondeur, puis relancer le montage.

### Boucle sur une seule photo (mobile, en ligne)

Un plan-séquence sur la photo du salon : travelling avant, glissement vers le mur tapissé,
rapproché sur le motif et le cadre doré, puis retour au plan large. C’est la version mobile
en ligne, car les photos du montage, très panoramiques, ne remplissent pas un écran
vertical. Une version ordinateur de cette boucle est aussi fournie.

```bash
# depuis belle-saison/, avec numpy, Pillow, opencv-python-headless et ffmpeg
python3 tools/make-hero-video.py montage sortie/   # ordinateur, 4 plans
python3 tools/make-hero-video.py boucle sortie/    # salon seul : ordinateur et mobile
# recalculer les cartes de profondeur (onnxruntime et le modèle
# depth_anything_v2_vits.onnx de github.com/fabio-sim/Depth-Anything-ONNX)
python3 tools/make-hero-video.py profondeur depth_anything_v2_vits.onnx media/montage-2-salon-toile.png
```

| Fichier (Contenu > Fichiers) | Format | Poids |
|---|---|---|
| `belle-saison-ouverture-film-1920x1080.mp4` | ordinateur, 16:9, montage 4 plans (en ligne) | 7,1 Mo |
| `belle-saison-ouverture-film-mobile-720x1280.mp4` | mobile, 9:16 (en ligne) | 5,0 Mo |
| `belle-saison-ouverture-film-boucle-1920x1080.mp4` | ordinateur, 16:9, salon seul | 6,9 Mo |
| `belle-saison-ouverture-film-couverture.jpg` | couverture ordinateur (première image du film) | 0,4 Mo |
| `belle-saison-ouverture-film-couverture-mobile.jpg` | couverture mobile | 0,2 Mo |

Les premières versions, sans le rendu film (`belle-saison-ouverture-montage-1920x1080.mp4`,
`belle-saison-ouverture-1920x1080.mp4`, `belle-saison-ouverture-mobile-720x1280.mp4`),
restent dans Contenu > Fichiers. Pour changer de vidéo : éditeur du thème > Ouverture vidéo
> Vidéo (ordinateur) ou Vidéo (mobile), et l’image de couverture correspondante.

## Vidéo « Notre histoire » (en ligne dans le thème)

Section « Notre histoire » > Vidéo d’ambiance. Sept plans cosy, peu de fleurs, 23 s en
boucle, format 4:3 (1440 x 1080), avec le rendu film de l’ouverture (relief, mise au point,
grain). Chaque plan reprend une idée des photos d’alfmabi envoyées en inspiration : passer
le seuil d’une porte, une console avec sa lampe, ses livres et un cadre, la matière du
papier peint en gros plan, un chevet calme. La scène vit : la lampe s’allume, le voilage
ondule, les bougies vacillent, la poussière flotte dans le soleil, une lumière rasante
glisse sur le papier peint.

| Plan | Temps | Détail | Mouvement |
|---|---|---|---|
| 1 | 0 à 4,2 s | le seuil du salon vers la salle à manger | on passe la porte, le point va du chambranle à la fenêtre |
| 2 | 3,2 à 7,3 s | la console, la lampe, les livres, le tableau doré | la lampe s’allume doucement |
| 3 | 6,3 à 10,5 s | la matière du papier peint | lumière rasante qui révèle la texture |
| 4 | 9,5 à 13,7 s | le fauteuil de lecture et son plaid au soleil | travelling avant, le voilage ondule |
| 5 | 12,7 à 16,8 s | le canapé, le plaid vert, la cheminée | le point passe du plaid aux bougies |
| 6 | 15,8 à 20 s | le lit, les oreillers, le plaid | travelling avant |
| 7 | 19 à 23,2 s | le chevet, la lampe, le fauteuil cannelé | le point passe du coussin à la lampe, puis fondu vers le début |

Deux étalonnages existent :

- **Lumière du jour (en ligne)** : blancs cassés, sauge et bois naturel, image claire et
  douce, peu de contraste, dans l’esprit des photos d’alfmabi. Réglages `HISTOIRE_JOUR`.
  Fichier : `belle-saison-histoire-2-jour-1440x1080.mp4` (4,6 Mo).
- **Heure dorée** : la lumière ambrée des photos d’origine, comme l’ouverture.
  Fichier : `belle-saison-histoire-2-doree-1440x1080.mp4` (6,3 Mo).

```bash
python3 tools/make-hero-video.py histoire-jour sortie/   # lumière du jour
python3 tools/make-hero-video.py histoire sortie/        # heure dorée
```

Les plans et les effets (`Glow`, `Flame`, `Curtain`, `LightSweep`) se règlent dans
`HISTOIRE`, en tête du script. Les versions précédentes (`belle-saison-histoire-film-…`,
`-cosy-…`, `-jour-…`) restent dans Contenu > Fichiers. Sur la boutique, la vidéo se lance
sans son et tourne en boucle dès que la section est visible ; un bouton permet de la mettre
en pause, et elle reste à l’arrêt pour les visiteurs qui ont demandé à réduire les animations.

**Limite assumée :** la scène elle-même ne bouge pas (rideaux, lumière). Pour obtenir ces
mouvements, utilisez un générateur vidéo en mode « image vers vidéo » avec les consignes
ci-dessous, puis remplacez la vidéo dans l’éditeur (section « Ouverture vidéo »).

### Consignes « image vers vidéo » pour l’ouverture

Donner `media/salon-ouverture-source.jpg` comme image de départ, 16:9, 1080p, 24 ou 25 i/s,
puis générer 4 plans de 5 s à monter bout à bout (fondus de 0,5 s) :

1. **0-5 s, travelling avant**
   > Extremely slow, stabilized dolly-in into this living room. Natural sunlight streams
   > through the French windows, linen curtains sway very gently in a light breeze, warm
   > golden light. Keep every object, the furniture and the wallpaper pattern exactly as in
   > the image. Photorealistic interior film, no people, no text.
2. **5-10 s, glissement latéral**
   > Very slow lateral camera slide to the right along the wallpapered wall, revealing the
   > gilded frame, the lamp, the cushions and the fireplace. Soft dust particles in the sunbeams.
   > The wallpaper pattern stays perfectly identical and static. Stabilized, calm, luxurious.
3. **10-15 s, rapproché**
   > Slow push-in on the sage foliage wallpaper and the gilded frame, shallow depth of field,
   > warm raking light revealing the matte paper texture. Camera almost still. Do not alter
   > or animate the wallpaper pattern.
4. **15-20 s, retour au plan large**
   > Slow, smooth pull-back to the wide view of the living room, ending on exactly the same
   > framing as the first image so the video can loop seamlessly. Gentle curtain movement only.

À ajouter à chaque consigne (champ « negative prompt » s’il existe) :

> no morphing, no warping walls, no moving furniture, no pattern changes, no flicker,
> no text, no logo, no people, no fast camera moves, no zoom bursts.

Contrôler image par image que le motif du papier peint ne se déforme pas : c’est le défaut
le plus fréquent des générateurs, et il trahirait le produit.

## Où vont les vidéos sur le site

| Emplacement | Réglage dans l’éditeur Shopify | Format | Durée |
|---|---|---|---|
| Ouverture vidéo (plein écran) | Ouverture vidéo > Vidéo (ordinateur) et Vidéo (mobile) | 16:9 et 9:16 | 15 à 20 s en boucle |
| Notre histoire | Notre histoire > Vidéo d’ambiance | 4:3 | 12 à 16 s en boucle |
| Film « Découvrir notre savoir-faire » | Notre histoire > Film complet (YouTube ou Vimeo) | 16:9 | 45 à 90 s, avec son |
| Vidéo plein écran | Vidéo plein écran > Vidéo | 16:9 paysage | 12 à 20 s en boucle |
| Fiche produit | Produit > Médias (à côté des photos) | 4:5 portrait | 6 à 10 s |
| Réseaux sociaux | (hors site) | 9:16 vertical | 8 à 15 s |

La section « Vidéo plein écran » reste invisible tant qu’aucune vidéo n’est choisie.
Sur le site, toutes les vidéos d’ambiance se lancent **sans son**, en boucle, quand elles
deviennent visibles. Un bouton permet de les mettre en pause, et elles ne se lancent pas
pour les visiteurs qui ont demandé à réduire les animations.

## Fichiers à préparer

- **MP4 (H.264)**, sans piste son pour les boucles, 24 ou 25 images par seconde.
- **1920 x 1080** pour l’ouverture et la vidéo plein écran, **1080 x 1350** pour les fiches produit.
- **Moins de 8 Mo** par boucle pour un chargement rapide (exporter en « qualité web »).
- **Boucle sans coupure** : la dernière image doit rejoindre la première (mouvement lent
  dans un seul sens, ou fondu de 1 s au raccord).
- **Rien de lisible** dans l’image : pas de texte, pas de logo (ajouter le logo au montage
  si besoin, pour les réseaux uniquement).
- Import : Contenu > Fichiers > Importer, puis choisir la vidéo dans l’éditeur du thème.

## Trois façons de produire les vidéos

1. **À partir de vos photos HD (je peux le faire ici).** Envoyez-moi vos photos de pièces
   tapissées en haute définition : je fabrique des boucles MP4 avec un zoom ou un panoramique
   très lent, au bon format pour le site.
2. **Avec un générateur vidéo** (Sora, Veo, Kling, Runway…). Les consignes ci-dessous sont
   prêtes à coller. Elles sont en anglais, langue que ces outils suivent le mieux.
   **Important :** un générateur ne reproduit pas fidèlement un motif précis. Pour les fiches
   produit, partez toujours d’une **vraie photo du produit** (mode « image vers vidéo ») afin
   que le client voie le papier qu’il achète. Les vidéos 100 % générées sont réservées à
   l’ambiance (ouverture, vidéo plein écran).
3. **Un tournage** avec un vidéaste : la liste des plans ci-dessous sert aussi de feuille de
   route.

## Consignes pour un générateur vidéo

Ajouter à chaque consigne :

> Style: quiet luxury interior film, natural window light, warm cream and deep forest green
> palette with sage and natural wood tones, shallow depth of field, slow and steady camera,
> photorealistic, 24 fps, no text, no logos, no people facing the camera, no fast motion.

### 1. Ouverture - « La pièce s’éveille » (16:9, 12 s, boucle)

> Slow dolly-in across a refined French country living room. The far wall is covered with
> wallpaper of soft sage-green foliage on an ivory ground. Early morning sunlight slowly moves
> across the wallpaper, revealing its matte texture. Linen curtains drift slightly in the
> breeze. A gilded frame, a ceramic vase with olive branches and a cream armchair stay in soft
> focus. The camera ends on the wallpaper texture, seamless loop.

Version « image vers vidéo » : donner votre plus belle photo de pièce comme première image,
avec « slow push-in, sunlight moving slowly across the wall, curtains drifting ».

### 2. Notre histoire - « Le geste » (16:9, 10 s, boucle)

> Close-up of two hands slowly unrolling a roll of premium wallpaper on an old oak work table.
> The paper shows a botanical pattern in sage green on ivory. Raking side light reveals the
> fine embossed texture of the paper. Very slow movement, shallow depth of field, calm and
> precise gestures, warm workshop atmosphere.

### 3. Film savoir-faire (YouTube ou Vimeo, 60 s)

Plans à enchaîner (5 à 8 s chacun), musique douce et sans paroles :

1. Gros plan sur le dessin d’un motif (crayon, aquarelle).
2. Impression : le papier défile lentement, lumière rasante.
3. Contrôle de la couleur : une main pose un échantillon sur une table.
4. Découpe des lés, règle et cutter.
5. Pose : la brosse lisse un lé, le raccord du motif s’aligne.
6. Pièce terminée : lent travelling arrière qui révèle le mur entier.

### 4. Vidéo plein écran - « Les paysages » (16:9, 15 s, boucle)

> Slow lateral pan along a dining room wall covered with a panoramic wallpaper mural of
> rolling Provence hills, cypress trees and soft mountains in muted sage, ochre and cream
> tones. Late afternoon golden light, a wooden table with linen napkins in the foreground,
> slightly out of focus. The camera glides from left to right at a constant slow speed,
> seamless loop.

### 5. Fiche produit - « La matière » (4:5, 8 s, à partir de la photo du produit)

> Macro shot of this wallpaper (use the provided product photo as the first frame). A soft
> beam of daylight slowly sweeps across the surface from left to right, revealing the paper
> texture and the depth of the printed pattern. Camera almost still, very slight push-in.

### 6. Réseaux sociaux - « La révélation » (9:16, 10 s)

> Start on an extreme close-up of a wallpaper detail (foliage pattern, sage on ivory), then a
> slow continuous pull-back revealing a bright bedroom with the full wall covered, a linen
> bed, a wooden bedside table and a lamp. Soft morning light, calm and elegant.

Ajouter ensuite au montage (CapCut, Premiere…) : le logo en fin de vidéo et une phrase
courte, par exemple « Belle Saison - papiers peints d’exception ».

## Liste de contrôle avant import

- La vidéo est lente, sans à-coups, et la boucle ne « saute » pas.
- Aucun texte, logo ou visage déformé n’apparaît (défauts fréquents des générateurs).
- Les couleurs restent dans la palette : crème, vert forêt, sauge, bois.
- Le motif montré sur une fiche produit est bien celui du produit vendu.
- Le fichier pèse moins de 8 Mo (boucles) et il est en MP4.
