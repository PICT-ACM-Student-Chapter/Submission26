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

# Expose your backend port
EXPOSE 3000

# Start the app
CMD ["npm", "start"]
