FROM node:22-alpine AS build
ARG BASE_URL=/
RUN npm i -g pnpm
WORKDIR /src
COPY . .
RUN pnpm i
RUN pnpm run build --base=${BASE_URL}

FROM nginx:alpine AS publish
COPY --from=build /src/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]