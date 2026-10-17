# bedrock-proj.github.io

Landing page for [Bedrock](https://github.com/bedrock-proj), built with [Astro](https://astro.build).
The specification reference itself is published separately from
[`spec`](https://github.com/bedrock-proj/spec) at `/spec/`.

The encoding section is generated from `isa/**/encodings.yaml` in the spec.
CI checks the spec out into `spec-src/`; locally, point `SPEC_DIR` at a checkout:

```sh
npm install
SPEC_DIR=../spec npm run build
```

The site redeploys on push to `main` and daily, so it follows spec changes.
