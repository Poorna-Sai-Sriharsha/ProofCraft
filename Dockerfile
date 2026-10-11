# Multi-stage production Dockerfile for ProofCart Server
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY server/package*.json ./

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copy server source code and config
COPY server/ ./

# Build TypeScript to dist
RUN npm run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install dumb-init or run with node
RUN apk add --no-cache dumb-init

# Copy package manifests and install only production dependencies
COPY server/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled code from builder
COPY --from=builder /app/dist ./dist

# Create local uploads storage directory with non-root ownership
RUN mkdir -p /app/uploads && chown -R node:node /app

USER node

EXPOSE 5000

# Healthcheck endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/v1/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
