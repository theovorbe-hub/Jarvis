# Veille concurrentielle

But : savoir qui vend des papiers peints comparables, à quel prix, avec quelles promesses, et en
tirer des décisions concrètes pour Belle Saison.

## Méthode

1. **Cadrer** : demander (ou déduire) l’objectif : fixer les prix, trouver des idées de
   collections, comparer les services (échantillons, délais, pose), surveiller un concurrent.
2. **Chercher** avec `WebSearch`, en mode `standard` d’abord, `extended` si les résultats sont
   pauvres. Plusieurs requêtes courtes valent mieux qu’une longue. Envoyer les requêtes
   indépendantes dans le même tour.
3. **Lire les pages** avec `WebFetch` si l’environnement le permet. Sinon, s’appuyer sur les
   extraits de la recherche et le dire : un prix vu dans un extrait est « indicatif ».
4. **Relever** les informations du tableau ci-dessous, avec la source de chacune.
5. **Conclure** par des recommandations chiffrées et datées.

## Requêtes types

Remplacer les éléments entre crochets. Varier les langues : les concurrents directs sont en
France, en Espagne, en Europe du Nord et en Inde.

- `papier peint sur mesure prix m² intissé [style]`
- `papier peint panoramique sur mesure [thème : campagne, toile de Jouy, botanique]`
- `papel pintado a medida precio m2` (Espagne)
- `custom size wallpaper mural price per square meter non-woven`
- `[nom du concurrent] échantillon papier peint délai livraison`
- `[nom du concurrent] avis clients papier peint`
- `tendances papier peint [année] intérieur` (tendances de saison)
- Restreindre à un site : paramètre `allowed_domains` (par exemple `["alfmabi.com"]`).

## Informations à relever

| Information | Pourquoi |
|---|---|
| Prix au m² (ou au rouleau, ramené au m²) | positionner le prix de Belle Saison |
| Qualités de papier proposées et grammage | comparer la montée en gamme |
| Sur mesure, découpe en lés numérotés | service attendu sur ce marché |
| Échantillon : prix, format, délai | argument fort de conversion |
| Délai et frais de livraison, pays d’impression | crédibilité des promesses |
| Collections, styles, nombre de motifs | idées de collections et manques |
| Arguments mis en avant (écologie, fabrication, pose) | ton et réassurance |
| Avis clients : note, volume, reproches fréquents | points faibles à exploiter |
| Réseaux sociaux : formats qui marchent (vidéos, avant/après) | idées de contenus |

## Modèle de rapport

```
## Veille concurrentielle : [sujet], [date]

| Concurrent | Pays | Prix au m² | Échantillon | Délai | Points forts | Source |
|---|---|---|---|---|---|---|

### Ce qu’il faut retenir
- [3 à 5 constats, chacun sourcé]

### Recommandations pour Belle Saison
1. [action concrète, chiffrée si possible]

### Non vérifié
- [ce qui n’a pas pu être lu, et pourquoi]
```

Si l’utilisateur veut un document à partager, proposer de mettre le rapport en page (document
ou page web) ; sinon, le donner directement dans la conversation.
