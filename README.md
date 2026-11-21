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

> **Les ports 80 et 443 sont déjà utilisés par un autre serveur web (Nginx, Apache…) ?** Caddy ne pourra pas démarrer
> (`address already in use`). Utilisez l'option Nginx ci-dessous.

## Production derrière un Nginx existant

Nginx gère le domaine et le certificat (certbot) et transmet le trafic à l'application, qui n'écoute qu'en local (`127.0.0.1:5173`).
Les autres sites du serveur ne sont pas touchés.

1. **DNS :** enregistrements `A` de votre domaine et de `www` vers l'IP du serveur.
2. **`.env`** (modèle : `.env.example`, option B) :
   ```
   ADMIN_PASSWORD=...
   DOMAIN=mondomaine.com
   COMPOSE_FILE=docker-compose.yml:docker-compose.nginx.yml
   ```
3. **Lancer l'application :** `docker compose up -d --build`
4. **Configuration Nginx** (remplacez `mondomaine.com` par votre domaine) :
   ```bash
   sed 's/mondomaine\.com/votre-domaine.com/g' nginx/dig-ecom.conf.example > /etc/nginx/conf.d/dig-ecom.conf
   nginx -t && systemctl reload nginx
   ```
   Ne rechargez que si `nginx -t` réussit : une erreur coupe tous les sites du serveur.
5. **Certificat HTTPS :** `certbot --nginx -d votre-domaine.com -d www.votre-domaine.com --redirect`

Le fichier d'exemple transmet l'IP réelle du visiteur (`X-Forwarded-For`, remplacé et non ajouté pour éviter la falsification) et le protocole
(`X-Forwarded-Proto`), et autorise l'envoi d'images jusqu'à 10 Mo.

## Autre proxy HTTPS (Traefik…)

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
