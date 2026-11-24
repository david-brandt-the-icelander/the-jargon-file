# The check step of the-jargon-file's zizd pipeline (see ../README.md). Node 22, as .nvmrc says.
FROM node:22.23.5-bookworm-slim@sha256:be979e5523c76fa4d5ca4ebd3099078f220aa47ec39c48ad5b5df9314debd6eb
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/*
COPY run.sh /run.sh
CMD ["bash", "/run.sh"]
