# Railway builds from repo root — this Dockerfile builds backend/
FROM node:20-alpine

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
RUN npm ci

COPY backend/prisma ./prisma/
COPY backend/tsconfig.json ./
COPY backend/src ./src/
COPY backend/scripts ./scripts/

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
