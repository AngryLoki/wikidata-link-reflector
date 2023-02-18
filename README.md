# Wikidata Link Reflector

## Developing

Once you've created a project and installed dependencies with `pnpm install`, start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

## Deploying on toolforge

```bash
become reflector

# mkdir www

# git clone https://github.com/AngryLoki/wikidata-link-reflector.git js
# curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
# nvm install 19 && nvm use 19
# curl -fsSL https://get.pnpm.io/install.sh | sh -
# pnpm add -g pnpm

source ~/.bashrc  # This enables pnpm and nvm

cd js
git pull

pnpm install
npm run build
webservice --backend=kubernetes node16 restart
```