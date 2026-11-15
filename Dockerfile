# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim

WORKDIR /app

# available if better-sqlite3 needs to compile its native module
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

ENV NEXT_TELEMETRY_DISABLED=1

# install dependencies separately so Docker can reuse this layer
# when application code changes but dependencies do not
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production

# DATABASE_PATH and PORT are supplied at runtime by the deployer service.
# this inital iamge runs as root to write to the mounted volume.
CMD ["npm", "start"]