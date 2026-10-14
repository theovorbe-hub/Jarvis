#!/usr/bin/env python3
"""Construit l'entrée de la mutation Shopify `productSet` pour un papier peint Belle Saison.

Usage : python3 fiche_produit.py produit.json > input.json

Le fichier produit.json suit le modèle de references/import-shopify.md. La sortie est
l'objet {"input": {...}} à passer tel quel en variables de la mutation. Les erreurs et les
avertissements sont écrits sur la sortie d'erreur ; en cas d'erreur, rien n'est écrit sur la
sortie standard et le script se termine avec le code 1.
"""
import json
import re
import sys

COLLECTIONS = {"essentiels", "motifs", "paysages", "toiles", "enfant"}
MODES = {"m2", "rouleau"}
OPTION = "Papier"
TEXTE = {"matiere", "pose", "entretien", "type_raccord"}
DECIMAL = {"largeur_le", "longueur_rouleau", "raccord", "largeur_visuel"}

erreurs, avertissements = [], []


def typo(texte, champ):
    """Apostrophes typographiques hors balises HTML ; signale les tirets longs."""
    if not isinstance(texte, str):
        return texte
    morceaux = re.split(r"(<[^>]*>)", texte)
    for i, m in enumerate(morceaux):
        if not m.startswith("<"):
            morceaux[i] = re.sub(r"(?<=\w)'(?=\w)", "’", m)
    resultat = "".join(morceaux)
    if "—" in resultat or "–" in resultat:
        avertissements.append(f"{champ} : tiret cadratin ou demi-cadratin à remplacer.")
    return resultat


def montant(valeur, champ):
    try:
        v = float(valeur)
    except (TypeError, ValueError):
        erreurs.append(f"{champ} : montant invalide ({valeur!r}).")
        return "0.00"
    if v < 0:
        erreurs.append(f"{champ} : montant négatif.")
    return f"{v:.2f}"


def variante(nom, prix, cout, sku, champ):
    v = {
        "optionValues": [{"optionName": OPTION, "name": nom}],
        "price": montant(prix, f"{champ}.prix"),
        "inventoryPolicy": "CONTINUE",
        "inventoryItem": {"tracked": False, "requiresShipping": True},
    }
    if cout is not None:
        v["inventoryItem"]["cost"] = montant(cout, f"{champ}.cout")
    if sku:
        v["sku"] = sku
    return v


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    with open(sys.argv[1], encoding="utf-8") as f:
        p = json.load(f)

    titre = typo(p.get("titre", "").strip(), "titre")
    if not titre:
        erreurs.append("titre manquant.")
    collection = p.get("collection")
    if collection not in COLLECTIONS:
        erreurs.append(f"collection « {collection} » inconnue : {', '.join(sorted(COLLECTIONS))}.")
    mode = p.get("mode_vente", "m2")
    if mode not in MODES:
        erreurs.append("mode_vente doit valoir « m2 » ou « rouleau ».")
    meta = p.get("metachamps") or {}
    if mode == "rouleau" and not (meta.get("largeur_le") and meta.get("longueur_rouleau")):
        erreurs.append("vente au rouleau : renseigner metachamps.largeur_le (cm) et metachamps.longueur_rouleau (m).")

    qualites = p.get("qualites") or []
    if not qualites:
        erreurs.append("au moins une qualité (variante) est nécessaire.")
    variantes, noms = [], []
    for i, q in enumerate(qualites):
        nom = typo((q.get("nom") or "").strip(), f"qualites[{i}].nom")
        if not nom:
            erreurs.append(f"qualites[{i}] : nom manquant.")
        if "chantillon" in nom.lower():
            erreurs.append(f"qualites[{i}] : « Échantillon » est réservé à la variante échantillon.")
        if nom in noms:
            erreurs.append(f"qualites[{i}] : nom en double ({nom}).")
        noms.append(nom)
        prix, cout = q.get("prix"), q.get("cout")
        if cout is not None and prix is not None and float(prix) / 1.2 <= float(cout):
            erreurs.append(f"qualites[{i}] ({nom}) : le prix HT ne couvre pas le coût d'achat.")
        elif cout is not None and prix is not None and float(prix) / 1.2 < 2 * float(cout):
            avertissements.append(f"{nom} : marge faible (prix HT inférieur à deux fois le coût).")
        variantes.append(variante(nom, prix, cout, q.get("sku"), f"qualites[{i}]"))

    ech = p.get("echantillon")
    if ech:
        sku = (qualites[0].get("sku") + "-ECH") if qualites and qualites[0].get("sku") else None
        noms.append("Échantillon A4")
        variantes.append(variante("Échantillon A4", ech.get("prix", 0), ech.get("cout"), sku, "echantillon"))

    images = p.get("images") or []
    if not images:
        erreurs.append("au moins une image est nécessaire.")
    fichiers = []
    visuels = [i for i, im in enumerate(images) if im.get("visuel")]
    if not visuels:
        avertissements.append("aucune image marquée « visuel »: true (motif à plat) : le simulateur « Voir sur mon mur » ne s’affichera pas.")
    elif len(visuels) > 1:
        erreurs.append("une seule image peut être marquée « visuel ».")
    for i, im in enumerate(images):
        url = im.get("url", "")
        if not url.startswith("https://"):
            erreurs.append(f"images[{i}] : adresse https publique attendue.")
        if not im.get("alt"):
            avertissements.append(f"images[{i}] : texte alternatif manquant (accessibilité, référencement).")
        fichiers.append({"originalSource": url, "alt": typo(im.get("alt", ""), f"images[{i}].alt"), "contentType": "IMAGE"})

    metafields = [{"namespace": "papier_peint", "key": "mode_vente", "type": "single_line_text_field", "value": mode}]
    for cle, valeur in meta.items():
        if valeur in (None, ""):
            continue
        if cle in TEXTE:
            metafields.append({"namespace": "papier_peint", "key": cle, "type": "single_line_text_field", "value": typo(str(valeur), f"metachamps.{cle}")})
        elif cle in DECIMAL:
            metafields.append({"namespace": "papier_peint", "key": cle, "type": "number_decimal", "value": str(float(valeur))})
        else:
            erreurs.append(f"metachamps.{cle} inconnu : {', '.join(sorted(TEXTE | DECIMAL))}.")
    four = p.get("fournisseur") or {}
    if four.get("plateforme"):
        metafields.append({"namespace": "sourcing", "key": "plateforme", "type": "single_line_text_field", "value": four["plateforme"]})
    if four.get("url"):
        metafields.append({"namespace": "sourcing", "key": "url", "type": "url", "value": four["url"]})
    if four.get("reference"):
        metafields.append({"namespace": "sourcing", "key": "reference", "type": "single_line_text_field", "value": str(four["reference"])})
    if not four:
        avertissements.append("fournisseur non renseigné : la liaison des commandes sera plus difficile à suivre.")

    seo = p.get("seo") or {}
    seo_titre = typo(seo.get("titre") or titre, "seo.titre")
    seo_desc = typo(seo.get("description") or "", "seo.description")
    if len(seo_titre) > 70:
        avertissements.append(f"seo.titre : {len(seo_titre)} caractères (70 au plus conseillé).")
    if not seo_desc:
        avertissements.append("seo.description manquante.")
    elif len(seo_desc) > 160:
        avertissements.append(f"seo.description : {len(seo_desc)} caractères (160 au plus conseillé).")

    description = p.get("description_html", "")
    if not description.strip():
        erreurs.append("description_html manquante : la rédiger avec la compétence description-de-produit.")
    elif description.count("<ul") < 2 or "<strong>" not in description:
        avertissements.append("description_html : structure en 6 blocs non reconnue (compétence description-de-produit, script verifier_fiche.py).")

    etiquettes = [collection] + [e for e in p.get("etiquettes", []) if e != collection]

    for a in avertissements:
        print(f"Attention : {a}", file=sys.stderr)
    if erreurs:
        for e in erreurs:
            print(f"Erreur : {e}", file=sys.stderr)
        sys.exit(1)

    entree = {
        "title": titre,
        "descriptionHtml": typo(p.get("description_html", ""), "description_html"),
        "vendor": "Belle Saison",
        "productType": "Papier peint",
        "status": "DRAFT",
        "tags": etiquettes,
        "productOptions": [{"name": OPTION, "position": 1, "values": [{"name": n} for n in noms]}],
        "variants": variantes,
        "files": fichiers,
        "metafields": metafields,
        "seo": {"title": seo_titre, "description": seo_desc},
    }
    json.dump({"input": entree}, sys.stdout, ensure_ascii=False, indent=2)
    print()
    if visuels:
        print(
            f"Après création : relier l’image n° {visuels[0] + 1} (motif à plat) au métachamp "
            "papier_peint.visuel (étape 3 bis de references/import-shopify.md).",
            file=sys.stderr,
        )


if __name__ == "__main__":
    main()
