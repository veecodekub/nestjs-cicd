# Base image for building the application
FROM node:24-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npx prisma generate

RUN npm run build

# Base image for production execution
FROM node:24-alpine

WORKDIR /usr/src/app

ARG APP_VERSION=unknown
ARG GIT_SHA=unknown
ARG IMAGE_TAG=unknown

ENV APP_NAME=nestjs-cicd
ENV APP_VERSION=${APP_VERSION}
ENV GIT_SHA=${GIT_SHA}
ENV IMAGE_TAG=${IMAGE_TAG}

COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/generated ./generated
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/prisma.config.ts ./prisma.config.ts

USER node

EXPOSE 3000

CMD ["node", "dist/src/main"]
