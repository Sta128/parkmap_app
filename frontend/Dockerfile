FROM node:22

WORKDIR /app

COPY package*.json .

RUN npm ci --registry=https://registry.npmjs.org/

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]