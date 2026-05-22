FROM node:20-alpine
RUN apk add --no-cache mongodb-tools tar gzip
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
# Asumimos que tu backend escucha en el 3000
EXPOSE 3000
CMD ["node", "server.js"]
