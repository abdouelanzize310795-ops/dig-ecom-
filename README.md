# Dige-e-com Academy — site et back office

Site vitrine + back office (formations, inscriptions, messages, galerie, paramètres).
Node.js 22 (SQLite intégré), **aucune dépendance npm**.

## Lancer avec Docker

```bash
docker compose up -d --build
```

- Site : http://localhost:5173 — Back office : http://localhost:5173/admin
- Mot de passe administrateur : définissez `ADMIN_PASSWORD` avant le premier lancement
  (variable d'environnement ou fichier `.env` à côté de `docker-compose.yml`).
  Sinon un mot de passe aléatoire est écrit dans le volume : `docker compose exec web cat data/MOT_DE_PASSE_INITIAL.txt`.
- Changez-le ensuite dans **Paramètres**.
- Les données (base SQLite, photos téléversées) sont dans le volume Docker `site-data` : elles survivent aux mises à jour.

## Derrière un proxy HTTPS (production)

Mettez `TRUST_PROXY=true` pour que les limitations de débit utilisent la vraie IP du visiteur, et faites transmettre
`X-Forwarded-For` et `X-Forwarded-Proto: https` par le proxy (cookie de session « Secure »).

## Sauvegarde

```bash
docker run --rm -v dige-ecom-academy_site-data:/data -v "$PWD":/backup alpine tar czf /backup/sauvegarde.tgz -C /data .
```

## Sans Docker

```bash
node server.js
```
