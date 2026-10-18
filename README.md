# Flooring Michigan

![License: MIT](https://img.shields.io/badge/license-MIT-green)
![Next.js 16](https://img.shields.io/badge/Next.js-16-black)
![React 19](https://img.shields.io/badge/React-19-blue)
![Tailwind CSS 4](https://img.shields.io/badge/Tailwind-4-38bdf8)

A flooring product catalog demo for Michigan. It lists 100 sample products with a filter panel (including plank-width range sliders) at `/flooring-michigan`. Product data is a static JSON file and the images are hosted on Pexels. There is no backend.

## Getting started

```bash
npm install
npm run dev     # http://localhost:3000/flooring-michigan
npm run build
npm run start
npm run lint
```

## Structure

```
app/
  flooring-michigan/
    page.tsx          # route and metadata
    view.tsx          # catalog view
    filter-panel.tsx  # filters
    data/products.json
  page.tsx            # default Next.js starter page
```

## License

MIT, see [LICENSE](LICENSE).
