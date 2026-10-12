#!/usr/bin/env python3
"""Chiffre des remises par quantité et un seuil de livraison offerte avant de les proposer.

Pour chaque quantité, applique la remise du palier atteint et calcule le bénéfice net
(après TVA, frais de paiement, coût d'achat et port payé par la boutique). Signale les
quantités où la marge nette passe sous le minimum voulu. Avec --panier-moyen, propose un seuil
de livraison offerte légèrement au-dessus du panier moyen.

Exemples :
  python3 paliers.py --prix 45 --cout 14 --port 9 --paliers "20:5,40:10" --unite m² --quantites 10,20,30,40,60
  python3 paliers.py --prix 120 --cout 35 --paliers "2:10,3:15" --unite rouleau --panier-moyen 380 --port 12
"""
import argparse
import math
import sys


def euros(valeur):
    return f"{valeur:,.2f} €".replace(",", " ").replace(".", ",")


def nombre(valeur):
    return f"{valeur:g}".replace(".", ",")


def unite(nom, quantite):
    """Accorde l'unité : « 2 rouleaux », « 3 articles », « 20 m² »."""
    if quantite < 2 or not nom[-1:].isalpha() or nom[-1] in "sxz":
        return nom
    return nom + ("x" if nom.endswith("eau") else "s")


def lire_paliers(texte):
    """« 2:10,3:15 » donne [(2, 0.10), (3, 0.15)], trié par quantité."""
    paliers = []
    for morceau in filter(None, (m.strip() for m in (texte or "").split(","))):
        try:
            quantite, remise = morceau.split(":")
            paliers.append((float(quantite.replace(",", ".")), float(remise.replace(",", ".")) / 100))
        except ValueError:
            sys.exit(f"Palier illisible : « {morceau} » (format attendu : quantité:remise en %, par exemple 2:10).")
    return sorted(paliers)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter, add_help=False)
    p.add_argument("--aide", "-h", "--help", action="help", help="afficher cette aide")
    p.add_argument("--prix", type=float, required=True, help="prix de vente unitaire TTC (au m², au rouleau ou à l'article)")
    p.add_argument("--cout", type=float, required=True, help="coût d'achat unitaire HT")
    p.add_argument("--port", type=float, default=0.0, help="port payé par la boutique pour une commande (€)")
    p.add_argument("--port-facture", type=float, default=0.0, help="frais de port facturés au client, TTC (€)")
    p.add_argument("--paliers", default="", help="paliers « quantité:remise % », par exemple « 2:10,3:15 »")
    p.add_argument("--quantites", default="", help="quantités à afficher, par exemple « 1,2,3,5 » (par défaut 1 et chaque palier)")
    p.add_argument("--unite", default="article", help="unité affichée : m², rouleau, article…")
    p.add_argument("--tva", type=float, default=0.20, help="taux de TVA (0,20 par défaut)")
    p.add_argument("--frais-pct", type=float, default=0.02, help="frais de paiement en part du montant TTC (0,02 = 2 %)")
    p.add_argument("--frais-fixes", type=float, default=0.25, help="frais de paiement fixes par commande (€)")
    p.add_argument("--marge-min", type=float, default=0.25, help="marge nette minimale acceptable (0,25 = 25 %)")
    p.add_argument("--panier-moyen", type=float, help="panier moyen TTC constaté, pour proposer un seuil de livraison offerte")
    a = p.parse_args()

    paliers = lire_paliers(a.paliers)
    if a.quantites:
        quantites = sorted({float(q.replace(",", ".")) for q in a.quantites.split(",") if q.strip()})
    else:
        quantites = sorted({1.0, *(q for q, _ in paliers)})

    print(f"Prix {euros(a.prix)} TTC par {a.unite} · coût {euros(a.cout)} HT · port payé {euros(a.port)} par commande\n")
    print(f"{'Quantité':<16}{'Remise':>8}{'Total TTC':>14}{'Bénéfice net':>16}{'Marge nette':>13}")
    alertes = []
    for q in quantites:
        remise = max((r for seuil, r in paliers if q >= seuil), default=0.0)
        total = a.prix * q * (1 - remise) + a.port_facture
        ht = total / (1 + a.tva)
        benefice = ht - (a.frais_pct * total + a.frais_fixes) - (a.cout * q + a.port)
        marge = benefice / ht if ht else 0.0
        repere = "  à revoir" if marge < a.marge_min else ""
        if repere:
            alertes.append(q)
        print(f"{nombre(q) + ' ' + unite(a.unite, q):<16}{nombre(round(remise * 100, 1)) + ' %':>8}{euros(total):>14}{euros(benefice):>16}{nombre(round(marge * 100)) + ' %':>13}{repere}")

    if alertes:
        liste = ", ".join(nombre(q) for q in alertes)
        print(f"\nMarge nette sous {nombre(round(a.marge_min * 100))} % pour : {liste} {unite(a.unite, max(alertes))}. Réduire la remise ou relever le seuil.")
    else:
        print(f"\nToutes les quantités gardent au moins {nombre(round(a.marge_min * 100))} % de marge nette.")

    if a.panier_moyen:
        seuil = math.ceil(a.panier_moyen * 1.25 / 10) * 10
        bas, haut = math.ceil(a.panier_moyen * 1.2 / 10) * 10, math.ceil(a.panier_moyen * 1.3 / 10) * 10
        print(f"\nLivraison offerte : seuil conseillé {euros(seuil)} (entre {euros(bas)} et {euros(haut)}, pour un panier moyen de {euros(a.panier_moyen)}).")
        if a.port:
            print(f"Le port offert coûte {euros(a.port)} par commande, soit {nombre(round(a.port / (seuil / (1 + a.tva)) * 100, 1))} % du montant HT d'une commande au seuil.")


if __name__ == "__main__":
    main()
