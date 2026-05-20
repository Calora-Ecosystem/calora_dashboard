FROM node:22-alpine AS base
RUN npm i -g pnpm
WORKDIR /src
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm i

FROM base AS build
ARG MODE=production
WORKDIR /src
COPY . .
RUN pnpm run build --mode=${MODE}

FROM nginx:alpine AS publish
COPY --from=build /src/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]