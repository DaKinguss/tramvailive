# Tram TM

Aplicație live pentru tramvaiele din Timișoara (STPT): hartă, poziții, sosiri, alerte.

Etichete pe hartă: **MB** (Matei Basarab), **P.Mocioni**, **P.Maria**, **CNB**.

## Ce trebuie pe calculator

- [Node.js 22+](https://nodejs.org/)
- npm (vine cu Node)

## Rulează local

```bash
git clone https://github.com/CONTUL_TAU/tram-tm.git
cd tram-tm
cp .env.example .env
# pune cheia CARTO în .env (vezi mai jos)
npm install
npm run dev
```

Deschide adresa afișată de Vite (de obicei portul 8080).

## Cheia hărții (CARTO)

Fără cheie, harta afișează „API KEY REQUIRED”.

1. Cere o cheie gratuită: https://carto.com/basemaps/apikey
2. În `.env`:

```
CARTO_API_KEY=cheia_ta
```

## Publică gratis pe internet (GitHub + Vercel)

GitHub Pages **nu** poate rula aplicația live (are nevoie de server pentru STPT și hărți).

Varianta gratuită:

1. Creează un repo nou pe GitHub (Public sau Private).
2. Încarcă acest proiect (Upload files, sau `git push`).
3. Intră pe [vercel.com](https://vercel.com) cu contul de GitHub (plan Hobby = gratis).
4. Importă repo-ul → Deploy.
5. Primești un link `https://ceva.vercel.app` pe care îl trimiți prietenilor.
6. Pe iPhone: Safari → Share → **Add to Home Screen**.

## Fișierul HTML simplu

`public/Tram-TM.html` e o pagină unică (hartă + etichete). O poți pune pe GitHub Pages, dar **tramvaiele live** de obicei nu merg acolo (STPT blochează cererile din browser). Pentru live, folosește Vercel.

## Comenzi

| Comandă | Ce face |
|---|---|
| `npm run dev` | pornește aplicația |
| `npm run build` | build de producție |
| `npm run typecheck` | verifică TypeScript |

Datele live vin de la STPT (`live.stpt.ro`). Harta: CARTO Dark Matter.
