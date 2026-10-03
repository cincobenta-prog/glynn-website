// Shared project registry. Add a new entry here when you drop a new folder.
window.PROJECTS = [
  {
    slug: "awake-ny",
    title: "Awake NY",
    credit: "POINT INTERNATIONAL",
    meta: ["LOOKBOOK", "NEW YORK"],
    accent: "#2b4a3e",
    folder: "images/projects/awake-ny/",
    images: [
      "4C19C060-5D1A-4701-999F-96CC4A728B69.jpg",
      "7B7D670F-CC87-4844-B851-7B394D63CA56.jpg",
      "AE5FDD54-F962-45B7-8CE7-503B416D36EC.jpg"
    ]
  },
  {
    slug: "uptown-danielas-flower-shop",
    title: "Uptown Daniela's\nFlower Shop",
    credit: "POINT INTERNATIONAL",
    meta: ["EDITORIAL", "NEW YORK"],
    accent: "#8e4356",
    folder: "images/projects/uptown-danielas-flower-shop/",
    images: Array.from({length: 34}, (_, i) => `${i+1}.jpg`)
  }
];
