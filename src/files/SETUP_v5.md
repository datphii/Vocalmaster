# VocabMaster v5 — Setup Guide

## Bước 1: Cài thêm react-router-dom
Mở Terminal trong thư mục vocabmaster, chạy:

```
npm install react-router-dom
```

## Bước 2: Copy files
Giải nén file vocabmaster-src.tar.gz vào thư mục src/
Hoặc copy từng file theo cấu trúc:

```
src/
├── App.jsx              ← FILE CHÍNH (thay thế file cũ)
├── main.jsx             ← Entry point (thay thế file cũ)
├── firebase.js          ← Firebase config
├── data/
│   └── vocab.js         ← 60 từ vựng
├── styles/
│   ├── variables.css    ← Design tokens
│   ├── reset.css        ← CSS reset
│   └── global.css       ← Global styles
└── components/
    ├── Navbar/
    │   ├── Navbar.jsx
    │   └── Navbar.module.css
    ├── Button/
    │   ├── Button.jsx
    │   └── Button.module.css
    └── DeckCard/
        ├── DeckCard.jsx
        └── DeckCard.module.css
```

## Bước 3: Xóa file cũ không cần
Xóa src/App.css (nếu có)
Xóa src/index.css (nếu có - đã thay bằng styles/global.css)

## Bước 4: Test
```
npm run dev
```
Mở http://localhost:5173

## Bước 5: Deploy
```
npm run build
firebase deploy --only hosting
```

## Lưu ý quan trọng:
- Cần cài react-router-dom TRƯỚC khi build
- Nếu có lỗi "Module not found", chạy: npm install
- Admin email: dodatphi@gmail.com (đã cấu hình trong firebase.js)
