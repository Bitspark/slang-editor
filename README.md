# Slang Editor

## Getting started

- `npm install`
- `npm start`

## Build package

- `npm run package`

::WARN::

Every time you run that command it overrides `src/styles/index.ts`. But do NOT COMMIT that changes. Beside that it doesn't cause any trouble. 

### Locally test this package in another project

- `npm run link`
- `cd <another_project_dir>`
- `npm link @b6k/slang-editor`

After that (as long as the linkage is set) you can just call `npm run package` to test changes.

## Release to npm

- Bump version in `package.json` and don't forget to commit
- Build package `dist/`
- `cd dist/`
- `npm publish`
