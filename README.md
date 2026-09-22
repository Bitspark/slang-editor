# Slang Editor

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Bitspark/slang-design/a16912ee2938ad9202380c88ce486adf893e5ccf/assets/logo/slang-logo-dark.svg">
    <img src="https://raw.githubusercontent.com/Bitspark/slang-design/a16912ee2938ad9202380c88ce486adf893e5ccf/assets/logo/slang-logo-light.svg" alt="Slang" width="280">
  </picture>
</p>

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

- simply run `npm version patch --force`

## Issues

- A main port connected to an operator, must disappear when thus operator is deleted.
- Readonly Blueprint Editor may not allow...
    ...adding new operators
    ...saving blueprint
    ...changing properties
- Connecting specified generic port to another generic port breaks port definition
    ...e.g. using a value operator with just emits one value
