# # FROM node:18-alpine
# # # ENV NODE_ENV production
# # WORKDIR /usr/src/app
# # COPY --chown=node:node . /usr/src/app
# # RUN mkdir -p ./logs
# # RUN chown node ./logs
# # RUN apk add --no-cache --virtual .build-deps alpine-sdk python3 
# # RUN apk add --no-cache openssl
# # RUN npm install   --ignore-scripts -f
# # RUN npm run generate:prisma
# # # RUN npm i nodemon -g

# # RUN apk del .build-deps
# # RUN npm run build:prod
# # USER node
# # EXPOSE 7400 
# # CMD ["npm", "run", "start:production"]


# FROM node:18-alpine

# WORKDIR /usr/src/app

# # Install system deps
# RUN apk add --no-cache --virtual .build-deps alpine-sdk python3 \
#     && apk add --no-cache openssl

# # Copy only package.json first (better caching)
# COPY package*.json ./

# # Install dependencies
# RUN npm install -f

# COPY prisma ./prisma

# # Generate prisma client
# RUN npx prisma generate

# # Copy the rest of the app
# COPY . .

# # COPY .env  ./

# # Build the app
# RUN npm run build

# # Cleanup build deps
# RUN apk del .build-deps

# # Create logs folder
# RUN mkdir -p ./logs && chown node ./logs

# USER node

# EXPOSE 7400

# CMD ["npm", "run", "start:prod"]

# Use Node.js LTS
FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy only package files first (better caching for dependencies)
COPY package*.json ./

# Install dependencies
RUN npm install --force

# Copy Prisma schema
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Copy the rest of the app
COPY . .

# Build TypeScript code (if using TS)
RUN npm run build

# Expose port
EXPOSE 7400

# Start the app
CMD ["npm", "run", "start:prod"]
