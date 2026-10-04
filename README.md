# Mina & Mirna — Our Little Universe

لعبة رومانسية 3D عربية معمولة لميرنا ❤️

## Live game

GitHub Pages: https://mina-sayed.github.io/mina-merna-memories/

## Stack

- React + TypeScript + Vite
- Three.js + React Three Fiber + Drei
- Framer Motion
- Tailwind CSS
- AppDeploy backend for shared memories and secure Admin Mode

## Admin Mode

الزوار يقدروا يلعبوا ويجمعوا الذكريات فقط. إضافة وحذف الذكريات محميين بـ `ADMIN_PIN` موجود على الـbackend فقط ولا يتم تخزينه داخل الريبو أو الـfrontend.

## Local development

```bash
npm install
npm run dev
```

للعمل مع الـshared memories محليًا، اضبط:

```bash
VITE_API_BASE_URL=https://mina-mirna-our-little-universe-rz3z8x.v2.appdeploy.ai
```

## Deployment

أي push إلى `main` يشغّل GitHub Actions وينشر `dist/` تلقائيًا على GitHub Pages.

> GitHub Pages يستضيف الـfrontend فقط. الـshared-memory API والـAdmin PIN يفضلوا على الـbackend الحالي.
