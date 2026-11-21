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

## Production avec HTTPS (Caddy)

Caddy obtient et renouvelle tout seul le certificat Let's Encrypt, redirige HTTP vers HTTPS et sert en HTTP/3.

1. **DNS :** créez un enregistrement `A` qui fait pointer votre domaine vers l'IP du serveur.
2. **Pare-feu :** ouvrez les ports 80 et 443, et fermez le port 5173 (l'application n'est plus exposée au public) :
   ```bash
   ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 443/udp && ufw delete allow 5173/tcp
   ```
3. **`.env`** (modèle : `.env.example`) :
   ```
   ADMIN_PASSWORD=...
   DOMAIN=mondomaine.com
   COMPOSE_FILE=docker-compose.yml:docker-compose.prod.yml
   ```
4. **Lancer :** `docker compose up -d --build`

Le site est alors sur `https://mondomaine.com` et le back office sur `https://mondomaine.com/admin`.
`SITE_URL`, `TRUST_PROXY` et `FORCE_HTTPS` sont réglés automatiquement par `docker-compose.prod.yml`.
Les certificats sont dans le volume `caddy-data` : ne le supprimez pas (limites de Let's Encrypt).
Pour rediriger aussi `www`, créez son enregistrement DNS et décommentez le bloc `www` du `Caddyfile`.

## Autre proxy HTTPS (Nginx, Traefik…)

Mettez `TRUST_PROXY=true` pour que les limitations de débit utilisent la vraie IP du visiteur, et faites transmettre
`X-Forwarded-For` et `X-Forwarded-Proto: https` par le proxy (cookie de session « Secure »).

Variables utiles dans le fichier `.env` (à côté de `docker-compose.yml`) :

| Variable | Rôle |
|---|---|
| `ADMIN_PASSWORD` | Mot de passe administrateur (première création de la base) |
| `SITE_URL` | URL publique, ex. `https://mondomaine.com` : balises canonical et Open Graph, sitemap, redirection HTTPS |
| `TRUST_PROXY` | `true` derrière un proxy HTTPS |
| `FORCE_HTTPS` | `true` pour rediriger HTTP vers HTTPS (avec `TRUST_PROXY=true`) ; active aussi HSTS |

Le site fournit `/robots.txt`, `/sitemap.xml`, une page 404, `/confidentialite` et `/conditions`.

## Sauvegarde

```bash
docker run --rm -v dige-ecom-academy_site-data:/data -v "$PWD":/backup alpine tar czf /backup/sauvegarde.tgz -C /data .
```

## Sans Docker

```bash
node server.js
```
