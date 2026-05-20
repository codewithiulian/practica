FROM node:22-alpine
WORKDIR /app

# Install full deps (incl. tsx, typescript — runtime needs tsx; no compile step)
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# App source
COPY . .

ENV NODE_ENV=production
# Fly injects $PORT at runtime; server.ts honors it (server.ts:21).
# 3100 is the default fallback for local docker runs.
EXPOSE 3100

CMD ["npm", "start"]
