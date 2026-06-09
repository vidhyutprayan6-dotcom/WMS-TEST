# Use this when Railway Root Directory is set to "backend"
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm ci --ignore-scripts

COPY tsconfig.json ./
COPY src ./src/
COPY scripts ./scripts/
COPY data ./data/

RUN npm run build

EXPOSE 3006

CMD ["npm", "run", "start:prod"]
