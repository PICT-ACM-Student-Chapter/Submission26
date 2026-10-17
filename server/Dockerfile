# -------------------------
# Render / Production build
# -------------------------
FROM node:18-alpine

WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy all source files
COPY . .

# Expose backend port
ENV PORT=3001
EXPOSE 3001

# Start the app
CMD ["npm", "start"]
