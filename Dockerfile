# Imagem de desenvolvimento do backend: roda com ts-node (npm run dev), sem build.
# Usada pelos serviços backend e seed do docker-compose.yml.
FROM node:24-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
# O binário do MongoDB dos testes de integração é baixado só quando os testes rodam.
RUN MONGOMS_DISABLE_POSTINSTALL=1 npm ci

COPY . .

EXPOSE 8080

CMD ["npm", "run", "dev"]
