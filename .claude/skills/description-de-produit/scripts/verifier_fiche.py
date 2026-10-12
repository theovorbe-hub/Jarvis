#!/usr/bin/env python3
"""Contrôle d'une fiche produit HTML écrite en 6 blocs.

Usage : python3 verifier_fiche.py fiche.html --titre "Nom du produit" [--typologie luxe]

Typologies : luxe, grand-public, technique, artisanat, mode.
Structure attendue (voir SKILL.md) : <p> accroche, <p> promesse, <ul> 3 à 5 arguments
« <strong>bénéfice</strong> : explication », <p> pour qui, <p><strong>Caractéristiques</strong></p>,
<ul> caractéristiques, <p> réassurance, <p> appel à l'action.
Code de sortie 1 s'il y a des erreurs ; les remarques n'empêchent pas la publication.
"""
import argparse
import re
import sys
from html.parser import HTMLParser

LONGUEURS = {"luxe": (120, 220), "grand-public": (80, 150), "technique": (120, 250), "artisanat": (120, 200), "mode": (80, 160)}
EMOJI = re.compile("[\U0001F300-\U0001FAFF☀-➿]")


class Blocs(HTMLParser):
    """Découpe le HTML en blocs de premier niveau (<p> et <ul>/<ol>) et en puces."""

    def __init__(self):
        super().__init__()
        self.blocs, self.pile, self.puce = [], [], None

    def handle_starttag(self, tag, attrs):
        if not self.pile and tag in ("p", "ul", "ol"):
            self.blocs.append({"tag": "ul" if tag in ("ul", "ol") else "p", "texte": "", "puces": []})
        if tag == "li" and self.blocs:
            self.puce = {"gras": "", "texte": "", "debut_gras": None}
            self.blocs[-1]["puces"].append(self.puce)
        if tag in ("strong", "b") and self.puce is not None and self.puce["debut_gras"] is None:
            self.puce["debut_gras"] = not self.puce["texte"].strip()
        self.pile.append(tag)

    def handle_endtag(self, tag):
        while self.pile:
            ouvert = self.pile.pop()
            if ouvert == tag:
                break
        if tag == "li":
            self.puce = None

    def handle_data(self, data):
        if not self.blocs:
            return
        self.blocs[-1]["texte"] += data
        if self.puce is not None:
            if self.pile and self.pile[-1] in ("strong", "b"):
                self.puce["gras"] += data
            self.puce["texte"] += data


def phrases(texte):
    return len([s for s in re.split(r"(?<=[.!?…])\s+", texte.strip()) if s.strip()])


def main():
    a = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    a.add_argument("fichier")
    a.add_argument("--titre", required=True, help="nom du produit (l'accroche ne doit pas commencer par lui)")
    a.add_argument("--typologie", default="luxe", choices=sorted(LONGUEURS))
    args = a.parse_args()
    html = open(args.fichier, encoding="utf-8").read()

    erreurs, remarques = [], []
    parseur = Blocs()
    parseur.feed(html)
    blocs = [b for b in parseur.blocs if b["texte"].strip() or b["puces"]]
    listes = [i for i, b in enumerate(blocs) if b["tag"] == "ul"]

    if len(listes) < 2:
        erreurs.append("il faut deux listes : les arguments (bloc 03) puis les caractéristiques (bloc 05).")
    i_arg = listes[0] if listes else len(blocs)
    i_spec = listes[1] if len(listes) > 1 else None

    avant = [b for b in blocs[:i_arg] if b["tag"] == "p"]
    if len(avant) < 2:
        erreurs.append("avant les arguments, il faut l'accroche (01) puis la promesse (02), chacune dans un <p>.")
    if avant:
        hook = avant[0]["texte"].strip()
        titre = args.titre.lower().strip()
        mots_titre = " ".join(titre.split()[:2])
        if hook.lower().startswith(titre) or (mots_titre and hook.lower().startswith(mots_titre)):
            erreurs.append("01 accroche : elle commence par le nom du produit ; partir du problème ou du désir du client.")
        if phrases(hook) > 1:
            remarques.append("01 accroche : une seule phrase attendue.")
        promesse = " ".join(b["texte"] for b in avant[1:])
        if phrases(promesse) > 2:
            remarques.append("02 promesse : 1 à 2 phrases attendues.")

    if listes:
        puces = blocs[i_arg]["puces"]
        if not 3 <= len(puces) <= 5:
            erreurs.append(f"03 arguments : {len(puces)} puce(s), il en faut 3 à 5.")
        for n, p in enumerate(puces, 1):
            reste = p["texte"].strip()[len(p["gras"].strip()):].lstrip()
            if not p["debut_gras"] or not p["gras"].strip():
                erreurs.append(f"03 argument {n} : il doit commencer par le bénéfice en gras.")
            elif not reste.startswith(":"):
                erreurs.append(f"03 argument {n} : le bénéfice en gras doit être suivi de « : » puis de l'explication.")

    if i_spec is not None:
        entre = [b for b in blocs[i_arg + 1:i_spec] if b["tag"] == "p"]
        pour_qui = [b for b in entre if b["texte"].strip().lower() != "caractéristiques"]
        if not pour_qui:
            erreurs.append("04 pour qui : la phrase qui décrit le client idéal manque entre les arguments et les caractéristiques.")
        elif phrases(pour_qui[0]["texte"]) > 1:
            remarques.append("04 pour qui : une seule phrase attendue.")
        for n, p in enumerate(blocs[i_spec]["puces"], 1):
            if len(p["texte"].strip()) > 80:
                remarques.append(f"05 caractéristique {n} : trop longue pour une puce ({len(p['texte'].strip())} caractères).")
        apres = [b for b in blocs[i_spec + 1:] if b["tag"] == "p"]
        if len(apres) < 2:
            erreurs.append("06 : il faut une ligne de réassurance puis une phrase d'appel à l'action, chacune dans un <p>.")
        else:
            if len(apres[0]["texte"].strip()) > 170:
                remarques.append("06 réassurance : une seule ligne attendue (170 caractères au plus).")
            if phrases(apres[-1]["texte"]) > 2:
                remarques.append("06 appel à l'action : une phrase attendue.")

    texte = " ".join(b["texte"] for b in blocs)
    mots = len(re.findall(r"\w+(?:[’']\w+)*", texte))
    mini, maxi = LONGUEURS[args.typologie]
    if not mini <= mots <= maxi:
        remarques.append(f"longueur : {mots} mots, {mini} à {maxi} conseillés pour la typologie « {args.typologie} ».")
    if "—" in texte or "–" in texte:
        erreurs.append("typographie : tiret cadratin ou demi-cadratin à remplacer.")
    if re.search(r"(?<=\w)'(?=\w)", texte):
        remarques.append("typographie : apostrophe droite (') à remplacer par ’.")
    if args.typologie == "luxe":
        if "!" in texte:
            remarques.append("ton : pas de point d'exclamation pour une marque haut de gamme.")
        if EMOJI.search(texte):
            remarques.append("ton : pas d'emoji pour une marque haut de gamme.")

    for e in erreurs:
        print(f"Erreur : {e}")
    for r in remarques:
        print(f"Remarque : {r}")
    if not erreurs and not remarques:
        print(f"Fiche conforme ({mots} mots).")
    sys.exit(1 if erreurs else 0)


if __name__ == "__main__":
    main()
