#!/usr/bin/env python3
"""Repère dans les textes d'une boutique ce qui fait douter le client ou le presse à tort.

Usage : python3 controle_confiance.py CHEMIN [CHEMIN ...] [--json]

CHEMIN : un dossier (thème Shopify, par exemple) ou des fichiers .liquid, .json, .html, .md,
.txt. Seul le texte que voit le client est lu : dans un fichier .liquid, les commentaires sont
ignorés et, dans le schéma, seules les valeurs par défaut comptent ; dans un fichier .json,
seules les valeurs (pas les clés).

Catégories signalées :
  doute       formulation qui nomme la peur (« Et si… ? », « hésiter », « inquiet »…)
  urgence     urgence ou rareté à vérifier (« dernière chance », « plus que 3 »…)
  promesse    engagement à vérifier dans les conditions de vente (garantie, remboursement…)
  pression    culpabilisation ou insistance
Code de sortie 1 s'il y a au moins un signalement.
"""
import argparse
import json
import re
import sys
from pathlib import Path

REGLES = [
    ("doute", r"\bet si\b", "Affirmer l’engagement au lieu de poser la question qui fait peur."),
    ("doute", r"h[ée]sit", "Proposer l’action (« Commencez par votre échantillon offert ») plutôt que l’hésitation."),
    ("doute", r"inqui[èeé]t", "Dire ce qui est prévu, sans évoquer l’inquiétude."),
    ("doute", r"\bpeur\b|\bcrain(?:te|dre)\b|\bdoutes?\b|\bangoiss", "Remplacer la peur par le bénéfice ou l’engagement."),
    ("doute", r"\brisques?\b|\bsans risque\b", "Préférer l’engagement concret (délai, échantillon, paiement sécurisé)."),
    ("doute", r"pas de panique|ne vous en faites pas", "Dire simplement ce que la boutique fait pour le client."),
    ("doute", r"\b(?:vous|me|se) trompe|\bse tromper\b|\berreur\b", "Montrer l’outil qui guide (calculateur, conseil) sans parler d’erreur."),
    ("doute", r"\bd[ée]çu|\bd[ée]ception|mauvaise surprise|\barnaque", "Supprimer : le texte installe l’idée d’une déception."),
    ("urgence", r"d[ée]p[êe]chez|derni[èe]re chance|ne (?:ratez|manquez) pas|vite\s*!", "Urgence acceptable seulement si elle est réelle (date de fin, date limite de livraison)."),
    ("urgence", r"plus que \d+|il (?:n’|')?en reste|il ne reste|stock limit[ée]|quantit[ée]s? limit[ée]", "Rareté acceptable seulement si le stock réel est suivi et affiché."),
    ("urgence", r"compte à rebours|countdown|expire dans|se termine (?:ce soir|aujourd)", "Une offre qui se termine doit vraiment se terminer à la date dite."),
    ("urgence", r"!{2,}", "Pas de points d’exclamation multiples."),
    ("promesse", r"satisfait ou rembours|rembours", "Vérifier que les conditions de vente le prévoient (exclu pour le sur-mesure)."),
    ("promesse", r"\bgaranti", "Vérifier que la garantie existe et figure dans les conditions de vente."),
    ("promesse", r"retours? (?:gratuits?|offerts?)", "Vérifier que les retours gratuits existent vraiment."),
    ("promesse", r"\bn[°o]\s?1\b|num[ée]ro un\b|\ble meilleur\b|\bla meilleure\b|\bles meilleur", "Superlatif invérifiable : le remplacer par un fait."),
    ("promesse", r"\b100\s?%", "Chiffre absolu à justifier ou à retirer."),
    ("pression", r"non merci,? je (?:pr[ée]f[èe]re|n’aime|n'aime|ne veux)", "Refus neutre : « Non merci »."),
    ("pression", r"vous (?:allez|risquez de) (?:le )?regretter|tout le monde (?:l’|l')?ach[èe]te", "Supprimer la culpabilisation."),
]
MOTIFS = [(cat, re.compile(motif, re.IGNORECASE), conseil) for cat, motif, conseil in REGLES]
EXTENSIONS = {".liquid", ".json", ".html", ".htm", ".md", ".txt"}
IGNORES = {"node_modules", ".git", "preview-out"}


def textes_json(valeur):
    """Toutes les chaînes d'une structure JSON (valeurs seulement)."""
    if isinstance(valeur, str):
        yield valeur
    elif isinstance(valeur, list):
        for v in valeur:
            yield from textes_json(v)
    elif isinstance(valeur, dict):
        for v in valeur.values():
            yield from textes_json(v)


def defauts_schema(valeur):
    """Valeurs par défaut d'un schéma de section : « default » et réglages des préréglages."""
    if isinstance(valeur, list):
        for v in valeur:
            yield from defauts_schema(v)
    elif isinstance(valeur, dict):
        for cle, v in valeur.items():
            if cle == "default" and isinstance(v, str):
                yield v
            elif cle == "settings" and isinstance(v, dict):
                yield from (s for s in v.values() if isinstance(s, str))
            else:
                yield from defauts_schema(v)


def sans_json_commentaire(texte):
    """Les modèles Shopify téléchargés commencent parfois par un commentaire /* … */."""
    return re.sub(r"^\s*/\*.*?\*/", "", texte, flags=re.DOTALL)


def segments(chemin, texte):
    """Morceaux de texte visibles par le client."""
    ext = chemin.suffix.lower()
    if ext == ".json":
        try:
            return list(textes_json(json.loads(sans_json_commentaire(texte))))
        except json.JSONDecodeError:
            return [texte]
    if ext == ".liquid":
        texte = re.sub(r"\{%-?\s*comment\s*-?%\}.*?\{%-?\s*endcomment\s*-?%\}", "", texte, flags=re.DOTALL)
        texte = re.sub(r"\{%-?\s*#.*?%\}", "", texte, flags=re.DOTALL)
        morceaux = []
        schema = re.search(r"\{%-?\s*schema\s*-?%\}(.*?)\{%-?\s*endschema\s*-?%\}", texte, flags=re.DOTALL)
        if schema:
            try:
                morceaux += list(defauts_schema(json.loads(schema.group(1))))
            except json.JSONDecodeError:
                pass
            texte = texte[: schema.start()] + texte[schema.end():]
        texte = re.sub(r"\{\{.*?\}\}|\{%.*?%\}", " ", texte, flags=re.DOTALL)
        return [re.sub(r"<[^>]+>", " ", texte)] + morceaux
    if ext in (".html", ".htm"):
        return [re.sub(r"<[^>]+>", " ", texte)]
    return [texte]


def ligne_de(texte_fichier, extrait):
    """Numéro de ligne approximatif d'un extrait dans le fichier."""
    position = texte_fichier.find(extrait)
    if position < 0:
        position = texte_fichier.lower().find(extrait.lower())
    return texte_fichier.count("\n", 0, position) + 1 if position >= 0 else 0


def fichiers(chemins):
    for chemin in chemins:
        p = Path(chemin)
        if p.is_dir():
            for f in sorted(p.rglob("*")):
                if f.is_file() and f.suffix.lower() in EXTENSIONS and not IGNORES & set(f.parts):
                    yield f
        elif p.is_file():
            yield p
        else:
            print(f"Introuvable : {chemin}", file=sys.stderr)


def controler(chemins):
    resultats = []
    for f in fichiers(chemins):
        brut = f.read_text(encoding="utf-8", errors="replace")
        vus = set()
        for segment in segments(f, brut):
            for cat, motif, conseil in MOTIFS:
                for m in motif.finditer(segment):
                    debut = max(0, m.start() - 50)
                    extrait = " ".join(segment[debut : m.end() + 50].split())
                    # Chercher d'abord le mot avec la suite de la phrase, pour viser la bonne occurrence.
                    suite = segment[m.start() : m.end() + 30].split("\n")[0]
                    ligne = ligne_de(brut, suite) or ligne_de(brut, m.group(0))
                    cle = (cat, m.group(0).lower(), extrait)
                    if cle in vus:
                        continue
                    vus.add(cle)
                    resultats.append({"fichier": str(f), "ligne": ligne, "categorie": cat, "mot": m.group(0), "extrait": extrait, "conseil": conseil})
    return resultats


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter, add_help=False)
    p.add_argument("--aide", "-h", "--help", action="help", help="afficher cette aide")
    p.add_argument("chemins", nargs="+", help="dossiers ou fichiers à contrôler")
    p.add_argument("--json", action="store_true", help="sortie JSON")
    a = p.parse_args()
    resultats = controler(a.chemins)
    if a.json:
        print(json.dumps(resultats, ensure_ascii=False, indent=2))
    else:
        for r in resultats:
            print(f"{r['fichier']}:{r['ligne']}  [{r['categorie']}] « {r['mot']} »\n    … {r['extrait']} …\n    → {r['conseil']}")
        par_cat = {}
        for r in resultats:
            par_cat[r["categorie"]] = par_cat.get(r["categorie"], 0) + 1
        detail = ", ".join(f"{n} {c}" for c, n in sorted(par_cat.items()))
        print(f"\n{len(resultats)} signalement(s)" + (f" : {detail}." if detail else "."))
    sys.exit(1 if resultats else 0)


if __name__ == "__main__":
    main()
