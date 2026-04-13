FROM denoland/deno:latest

WORKDIR /app
COPY . .
RUN deno install
RUN deno task build

EXPOSE 8000
CMD ["deno", "task", "start"]
