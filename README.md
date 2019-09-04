# Slang Editor

## Getting started

- `npm install`
- `npm start`

## Build package

- `npm run package`

::WARN::

Every time you run that command it overrides `src/styles/index.ts`. But do NOT COMMIT that changes. Beside that it doesn't cause any trouble. 

### Locally test this package in another project

- Build package `dist/`
- `cd dist/ && npm link`
- `cd <another_project_dir>`
- `npm link @b6k/slang-editor`

## Release to npm

- Bump version in `package.json` and don't forget to commit
- Build package `dist/`
- `cd dist/`
- `npm publish`
