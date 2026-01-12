FROM node:20-alpine

WORKDIR /app

# Install Python for ingestion scripts
RUN apk add --no-cache python3 py3-pip && \
    ln -sf python3 /usr/bin/python
# Install python dependencies
RUN pip3 install pandas openpyxl openai python-dotenv --break-system-packages

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
