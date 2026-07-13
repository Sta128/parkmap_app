FROM node:22
WORKDIR /app
COPY package*.json .
RUN npm ci --registry=https://registry.npmjs.org/
COPY . .
RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]
