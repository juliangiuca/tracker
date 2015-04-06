FROM node:0.10.36-slim

ADD . /app
WORKDIR /app
RUN npm install

EXPOSE 80

CMD npm start
