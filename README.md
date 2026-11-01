# Treino para o Concurso: 130 perguntas

A one-page, static practice test (multiple choice) for the Técnico Superior exam at IPCB/UPCB.
Plain HTML + CSS + vanilla JavaScript. No build step, no dependencies, works offline.

## Files

- `index.html` – the page (start screen, question screen, results screen)
- `styles.css` – styles (light/dark theme, responsive)
- `app.js` – test logic, progress saved in `localStorage` (`upcb_teste_v130`)
- `data/questions.js` – the 130 questions (`window.QUESTIONS = [...]`)
- `scripts/validate.js` – dev check for the question data

## Open it locally

Double-click `index.html` (it works from `file://`, no server needed).
Optionally, serve the folder: `python3 -m http.server` and open <http://localhost:8000>.

## Check the data

```bash
node scripts/validate.js
```

It asserts 130 questions, 4 options each, a correct letter A–D, the per-section counts and the
correct-letter distribution (A 33, B 33, C 32, D 32).

## Deploy for free

**Netlify Drop:** go to <https://app.netlify.com/drop> and drag this folder onto the page. You get a public URL in seconds.

**GitHub Pages:**
1. Create a repository and push these files to the `main` branch (with `index.html` at the root).
2. In the repository, open *Settings → Pages*, choose *Deploy from a branch*, branch `main`, folder `/ (root)`, and save.
3. The site appears at `https://<user>.github.io/<repository>/` after a minute or two.

Progress is stored per browser; "Recomeçar tudo" on the start screen clears it.
