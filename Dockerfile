# syntax=docker/dockerfile:1.7
# StartX: Vite/Svelte build → embedded in a static Go binary → small Alpine image (Coolify, Dockerfile build pack).

FROM node:24-alpine AS web
WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY web/ ./
RUN npm run build

FROM golang:1.24-alpine AS server
WORKDIR /src
ENV CGO_ENABLED=0 GOFLAGS=-trimpath
COPY server/go.mod server/go.sum ./
RUN go mod download
COPY server/ ./
COPY --from=web /web/dist ./dist
RUN go vet ./... && go test ./... && go build -ldflags="-s -w" -o /startx .

# Alpine rather than distroless: Coolify's healthcheck runs wget inside the container.
FROM alpine:3.22
RUN adduser -D -H -u 10001 startx
COPY --from=server /startx /usr/local/bin/startx
ENV PORT=8080
EXPOSE 8080
USER startx
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD ["startx", "-healthcheck"]
ENTRYPOINT ["startx"]
