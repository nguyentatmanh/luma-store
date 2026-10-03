FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:24-alpine AS runtime
ENV NODE_ENV=production PORT=8080 UPLOAD_DIR=/app/uploads
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads
USER node
EXPOSE 8080
CMD ["node", "src/server.js"]
