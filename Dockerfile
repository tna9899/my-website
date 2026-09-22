FROM node:20-alpine

WORKDIR /app

# Copy toan bo ma nguon va anh da dang
COPY . .

# Bien moi truong mac dinh
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "server.js"]
