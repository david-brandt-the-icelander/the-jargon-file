# `.zazzle/zizd/`: the-jargon-file's zizd pipeline

The steps zazzle's builders run for this repository, written against zazzle's step-pipeline spec
(`src/macos/zazzle-pipeline/pipeline-spec.md`, sections 1–4). One pipeline, `default`, with one step in
`.zazzle/zizd/check/` (a `Dockerfile` and a `run.sh`). There is nothing to deploy: icelander.net builds the File from its
submodule `vendor/the-jargon-file`. The pipeline file itself lives in the orchestrator
(`continuous_integration_and_delivery`, `.zazzle/zizd/pipelines/david-brandt-the-icelander/the-jargon-file/default.json`);
the copy below is what goes there.

| Step | Image | What it does | Leaves in `/zazzle/output` |
|---|---|---|---|
| `check` | `node:22.23.5-bookworm-slim` (`.nvmrc` says 22) with git | what the legacy runner's `scripts/ci.sh` does for each commit: `npm ci`, `npm test`, `npm run build` (offline and deterministic), then `git diff --exit-code -- LINKS.md FIXES.md` (the build left the reports as committed) | `the-jargon-file-dist.tar.gz`: the built File (`dist/`: entries, pages, visuals, images, report) |

The step works in a clone of the read-only checkout that shares its objects, so `git diff` compares with the commit.

Every `FROM` names its image by tag and by digest (the multi-arch index), so a rebuilt image starts from the same
bytes on any builder.

## The pipeline file

```json
{
  "id": "david-brandt-the-icelander/the-jargon-file:default",
  "repos": ["https://github.com/david-brandt-the-icelander/the-jargon-file.git"],
  "steps": [
    { "name": "check", "path": ".zazzle/zizd/check" }
  ],
  "supersede": true
}
```

No `paths`: the build reads the Markdown reports too, so every commit can change the result.

## Config keys

None. The repository is public; the legacy runner's `GITHUB_TOKEN` only posted commit statuses, which zizd now shows.
The builder's own `GITHUB_TOKEN` and z3 keys (`shared.json`) are zazzle's and reach no step. Nothing goes in
`deploy_keys`.

## The weekly link check is not here

The legacy runner also checks the File's outside links on `main` once a week (`scripts/links.sh`:
`node scripts/check-links.js --ci`, about twenty minutes). That is a scheduled job, and scheduled jobs belong to
**zeecron**, a separate service, so it is left out of this pipeline. It keeps running in the legacy runner until zeecron
can take it.

## Trying it by hand

The step was run with the spec's "Trying a step by hand" recipe (`--cpus 2 --memory 4g --pids-limit 4096`, the host's
uid, the repository read-only).

## What goes at cutover

The legacy runner `continuous_integration_and_delivery/the-jargon-file/` stays for now. At cutover its per-commit checks
(`scripts/ci.sh`, `scripts/watch.sh`'s polling and the `ci/the-jargon-file` commit status) are replaced by this
pipeline; its weekly link check (`scripts/links.sh`) waits for zeecron. The required status check `ci/the-jargon-file` in
the branch protection then needs replacing too. The repository has no GitHub workflows left to remove.
