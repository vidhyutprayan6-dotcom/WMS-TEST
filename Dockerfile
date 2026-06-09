# Railway builds from repo root — builds backend/
FROM node:20-alpine

WORKDIR /app

# Copy package files AND prisma schema before npm ci
# (postinstall must NOT run prisma generate before schema exists)
COPY backend/package.json backend/package-lock.json ./
COPY backend/prisma ./prisma/

RUN npm ci --ignore-scripts

COPY backend/tsconfig.json ./
COPY backend/src ./src/
COPY backend/scripts ./scripts/
COPY backend/data ./data/

RUN npm run build

EXPOSE 3006

CMD ["npm", "run", "start:prod"]
