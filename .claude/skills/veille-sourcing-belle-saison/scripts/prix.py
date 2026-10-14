#!/usr/bin/env python3
"""Prix de vente conseillé d'un papier peint pour Belle Saison.

Ramène le coût du fournisseur au m², ajoute le port et les frais fixes répartis sur une
commande type, puis calcule le prix TTC qui donne la marge nette visée après TVA et frais de
paiement. Le prix est arrondi à l'euro supérieur.

Exemples :
  python3 prix.py --cout-m2 9.50 --port-commande 12 --m2-commande 10 --marge 0.55
  python3 prix.py --cout-rouleau 18 --m2-rouleau 5.33 --port-commande 9 --m2-commande 10.6
  python3 prix.py --cout-m2 10 --port-commande 12 --prix-vente 39 --marge 0.25 --provision 0.05
"""
import argparse
import math
import sys


def euros(value):
    return f"{value:,.2f} €".replace(",", " ").replace(".", ",")


def nombre(value):
    return f"{value:g}".replace(".", ",")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter, add_help=False)
    p.add_argument("--aide", "-h", "--help", action="help", help="afficher cette aide")
    p.add_argument("--cout-m2", type=float, help="coût d'achat au m² (€)")
    p.add_argument("--cout-rouleau", type=float, help="coût d'achat d'un rouleau (€)")
    p.add_argument("--m2-rouleau", type=float, help="surface d'un rouleau (m²), par exemple 0,53 x 10,05 = 5,33")
    p.add_argument("--port-commande", type=float, default=0.0, help="frais de port payés au fournisseur par commande (€)")
    p.add_argument("--m2-commande", type=float, default=10.0, help="surface d'une commande type (m², 10 par défaut)")
    p.add_argument("--marge", type=float, default=0.5, help="marge nette visée sur le chiffre d'affaires HT (0,5 = 50 %)")
    p.add_argument("--tva", type=float, default=0.20, help="taux de TVA (0,20 par défaut)")
    p.add_argument("--frais-pct", type=float, default=0.02, help="frais de paiement en part du prix TTC (0,02 = 2 %)")
    p.add_argument("--frais-fixes", type=float, default=0.25, help="frais de paiement fixes par commande (€)")
    p.add_argument("--provision", type=float, default=0.0, help="provision en part du CA HT pour échantillons offerts, réimpressions et litiges (0,05 = 5 %)")
    p.add_argument("--prix-vente", type=float, help="prix TTC au m² imposé (alignement sur la concurrence) : calcule la marge obtenue au lieu du prix")
    a = p.parse_args()

    if a.cout_m2 is None:
        if a.cout_rouleau is None or not a.m2_rouleau:
            sys.exit("Indiquer --cout-m2, ou --cout-rouleau avec --m2-rouleau.")
        cout_m2 = a.cout_rouleau / a.m2_rouleau
    else:
        cout_m2 = a.cout_m2
    if a.m2_commande <= 0:
        sys.exit("--m2-commande doit être positif.")

    revient = cout_m2 + (a.port_commande + a.frais_fixes) / a.m2_commande
    if a.prix_vente:
        prix_impose(a, cout_m2, revient)
        return
    denominateur = (1 - a.marge) / (1 + a.tva) - a.frais_pct - a.provision / (1 + a.tva)
    if denominateur <= 0:
        sys.exit("Marge impossible à atteindre avec ces frais : baisser --marge.")
    prix = math.ceil(revient / denominateur)
    ht = prix / (1 + a.tva)
    benefice = ht - a.frais_pct * prix - a.provision * ht - revient
    marge = benefice / ht

    print(f"Coût d'achat au m²             {euros(cout_m2)}")
    print(f"Coût de revient au m²          {euros(revient)}  (port et frais fixes répartis sur {nombre(a.m2_commande)} m²)")
    print(f"Prix conseillé au m² TTC       {euros(prix)}")
    print(f"Prix au m² HT                  {euros(ht)}")
    print(f"Bénéfice net au m²             {euros(benefice)}  (marge nette {marge * 100:.0f} %)")
    print(f"Coefficient prix TTC / coût    {nombre(round(prix / revient, 1))}")
    print(f"Commande type ({nombre(a.m2_commande)} m²)        {euros(prix * a.m2_commande)} TTC, bénéfice {euros(benefice * a.m2_commande)}")
    if a.m2_rouleau:
        print(f"Prix conseillé au rouleau TTC  {euros(math.ceil(prix * a.m2_rouleau))}  ({nombre(a.m2_rouleau)} m² par rouleau)")


def prix_impose(a, cout_m2, revient):
    """Prix fixé par le marché : marge nette obtenue, coût d'achat maximal et budget publicitaire."""
    prix = a.prix_vente
    ht = prix / (1 + a.tva)
    frais = a.frais_pct * prix + a.provision * ht
    benefice = ht - frais - revient
    marge = benefice / ht
    cout_max = ht * (1 - a.marge) - frais - (a.port_commande + a.frais_fixes) / a.m2_commande
    pub_max = benefice - a.marge * ht
    print(f"Prix de vente au m² TTC         {euros(prix)}  (HT {euros(ht)})")
    print(f"Coût d'achat au m²              {euros(cout_m2)}")
    print(f"Coût de revient au m²           {euros(revient)}  (port et frais fixes répartis sur {nombre(a.m2_commande)} m²)")
    if a.provision:
        print(f"Provision (échantillons, SAV)   {euros(a.provision * ht)} au m² ({nombre(round(a.provision * 100, 1))} % du HT)")
    print(f"Bénéfice net au m²              {euros(benefice)}  (marge nette {marge * 100:.0f} % avant publicité)")
    print(f"Commande type ({nombre(a.m2_commande)} m²)         {euros(prix * a.m2_commande)} TTC, bénéfice {euros(benefice * a.m2_commande)}")
    statut = "respectée" if marge >= a.marge else "NON respectée"
    print(f"Marge minimale {a.marge * 100:.0f} %            {statut}")
    print(f"Coût d'achat maximal au m²      {euros(cout_max)}  pour garder {a.marge * 100:.0f} % de marge nette")
    if pub_max > 0:
        print(f"Publicité possible par commande {euros(pub_max * a.m2_commande)}  ({nombre(a.m2_commande)} m²) en gardant {a.marge * 100:.0f} % de marge nette")


if __name__ == "__main__":
    main()
