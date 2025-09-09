# Stage 1: Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install deps first (cache optimization)
COPY package*.json tsconfig.json ./
RUN npm install   --ignore-scripts -f

# Copy source code
COPY . .

# Generate Prisma client & Nexus schema
RUN npm run generate:prisma
#

# Build TypeScript -> build folder
RUN npm run build


# Stage 2: Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy only needed files
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/build ./build
COPY --from=builder /app/prisma ./prisma

# Install only production deps
# RUN npm install --omit=dev

# Expose application port
EXPOSE 3000

# Default command (env vars passed at runtime)
CMD ["node", "build/server.js"]