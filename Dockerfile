# Dige-e-com Academy — site + back office (Node.js 22, SQLite intégré, aucune dépendance npm)
FROM node:22-alpine

ENV NODE_ENV=production PORT=5173
WORKDIR /app

COPY server.js ./
COPY public ./public

# Les données (base SQLite, images téléversées, mot de passe initial) vivent dans un volume
RUN mkdir -p /app/data && chown -R node:node /app
USER node
VOLUME ["/app/data"]
EXPOSE 5173

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5173/api/public >/dev/null || exit 1

CMD ["node", "--disable-warning=ExperimentalWarning", "server.js"]
