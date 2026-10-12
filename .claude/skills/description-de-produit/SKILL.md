---
name: description-de-produit
description: "Rédiger une fiche produit e-commerce qui convertit, en 6 blocs (accroche, promesse, arguments, pour qui, caractéristiques, réassurance et appel à l’action), adaptée à la typologie du projet (marque, positionnement, ton, langue, plateforme). Utiliser cette compétence pour toute description de produit à écrire, réécrire, améliorer ou traduire : fiche Shopify, import de produits, page produit, texte de vente d’un article, et pour chaque produit de la boutique Belle Saison, même si l’utilisateur dit simplement « fais la description » ou « ajoute ce produit »."
---

# Description de produit

Tu es un expert en copywriting e-commerce. Tu rédiges une fiche produit complète qui convertit,
en suivant **exactement** la structure en 6 blocs ci-dessous, et en l’adaptant au projet.

## Étape 0. S’adapter au projet

Une bonne fiche parle la langue de la marque. Avant d’écrire, réunir :

1. **La marque** : lire les consignes du projet (CLAUDE.md, README, références de marque). Pour
   Belle Saison, lire `references/belle-saison.md`. En retenir le positionnement, le ton, la
   langue, le tutoiement ou le vouvoiement et les règles de typographie.
2. **Le produit** : uniquement des données réelles (fiche fournisseur, métachamps, variantes,
   prix, dimensions, matière, entretien, délais). Une information absente reste absente :
   la signaler dans « À compléter » plutôt que de l’inventer. Ne jamais inventer de
   certification, de garantie, d’avis client, de chiffre ou de provenance.
3. **Les engagements réels de la boutique** : livraison, échantillons, retours, garantie, tels
   qu’affichés sur le site ou dans ses conditions de vente. La réassurance ne promet que ce qui
   existe.
4. **La typologie**, qui règle le style :

| Typologie | Registre | Longueur | À éviter |
|---|---|---|---|
| Luxe, haut de gamme, décoration | sobre, sensoriel, vouvoiement, phrases calmes | 120 à 220 mots | points d’exclamation, superlatifs creux, emojis, urgence forcée |
| Grand public, promotion | direct, énergique, concret | 80 à 150 mots | jargon, phrases longues |
| Technique, B2B, outillage | précis, factuel, chiffré | 120 à 250 mots | lyrisme, promesses vagues |
| Artisanat, fait main | chaleureux, histoire du geste et de la matière | 120 à 200 mots | vocabulaire industriel |
| Mode, beauté | désirable, sensoriel, centré sur la personne | 80 à 160 mots | listes de composants sans bénéfice |

## Les 6 blocs

**01. HOOK** : 1 phrase qui accroche. Commencer par le problème ou le désir du client, jamais par
le nom du produit.

**02. PROMESSE** : 1 à 2 phrases sur la transformation concrète après l’achat. Le bénéfice avant
la caractéristique, toujours.

**03. ARGUMENTS** : 3 à 5 puces. Format strict : **Bénéfice en gras** : explication courte. Le
bénéfice d’abord, la caractéristique sert d’explication.

**04. POUR QUI** : 1 phrase qui qualifie précisément le client idéal. Être spécifique (pièce,
style de vie, projet), pas « pour tous ceux qui aiment la décoration ».

**05. SPECS TECHNIQUES** : puces courtes avec uniquement les informations utiles à la décision
d’achat (matière, dimensions ou mode de vente, pose, entretien, raccord, délai). Les valeurs
doivent être identiques à celles des métachamps ou de la fiche fournisseur.

**06. RÉASSURANCE + CTA** : livraison, garantie, retours en 1 ligne, puis 1 phrase d’appel à
l’action avec une raison d’agir maintenant. La raison doit être vraie (échantillon offert,
fabrication à la commande, saison qui s’y prête), jamais une fausse rareté ni un faux compte à
rebours.

## Livrable

Toujours rendre les trois parties suivantes.

**1. Fiche à relire**, avec les numéros de blocs pour faciliter la relecture :

```
01 HOOK : …
02 PROMESSE : …
03 ARGUMENTS :
- **…** : …
04 POUR QUI : …
05 SPECS :
- …
06 RÉASSURANCE : …
   CTA : …
À compléter : … (ou « rien »)
```

**2. HTML de la boutique**, sans les numéros de blocs (le client ne les voit pas). Pour Shopify,
c’est le champ `descriptionHtml` :

```html
<p>[hook]</p>
<p>[promesse]</p>
<ul>
  <li><strong>[bénéfice]</strong> : [explication]</li>
</ul>
<p>[pour qui]</p>
<p><strong>Caractéristiques</strong></p>
<ul>
  <li>[spec]</li>
</ul>
<p>[réassurance]</p>
<p>[CTA]</p>
```

**3. Référencement** : titre SEO de 70 caractères au plus et méta-description de 160 caractères
au plus, qui reprennent le bénéfice principal et le mot-clé du produit.

## Vérifier avant de livrer

Lancer le contrôle automatique sur le HTML :

```bash
python3 scripts/verifier_fiche.py fiche.html --titre "Nom du produit" --typologie luxe
```

Il vérifie la structure (accroche qui ne commence pas par le nom du produit, 3 à 5 arguments
au format gras + deux-points, présence des caractéristiques, réassurance et appel à l’action),
la longueur selon la typologie et la typographie française. Corriger tout ce qu’il signale,
puis relire soi-même avec ces questions :

- Un client pressé comprend-il en lisant seulement l’accroche et les mots en gras pourquoi
  acheter ?
- Chaque argument dit-il ce que le client y gagne avant de dire comment ?
- Chaque information est-elle vraie et vérifiable ?

## Plusieurs produits

Pour une série de produits (une collection, un import), garder le même ton mais varier les
accroches et les arguments : deux fiches qui commencent pareil donnent une impression de
catalogue. Rendre un tableau récapitulatif à la fin : produit, accroche, points à compléter.
