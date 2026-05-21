FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
# Asumimos que tu backend escucha en el 3000
EXPOSE 3000
CMD ["node", "server.js"]
