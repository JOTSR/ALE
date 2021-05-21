FROM hayd/deno:alpine-1.10.2
WORKDIR /app
COPY . /app
RUN apk add --no-cache --update nodejs npm
RUN npm i -g sass
RUN npm i -g --unsafe-perm=true esbuild
RUN deno install -qA -n vr https://deno.land/x/velociraptor@1.0.0-beta.18/cli.ts
EXPOSE 8080
EXPOSE 3000
# CMD [ "vr", "run", "watch" ]