// build-gallery.js
// Scanne le dossier /images (structure: images/<categorie>/<nom-album>/*.jpg)
// et genere gallery-data.js, utilise par index.html pour afficher les photos.
// Ce script tourne automatiquement a chaque deploiement Vercel — tu n'as rien a lancer toi-meme.

const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, 'images');
const OUTPUT_FILE = path.join(__dirname, 'gallery-data.js');
const VALID_EXT = ['.jpg', '.jpeg', '.png', '.webp'];

function isImage(file) {
  return VALID_EXT.includes(path.extname(file).toLowerCase());
}

function buildGallery() {
  const albums = [];

  if (!fs.existsSync(IMAGES_DIR)) {
    console.log('Aucun dossier images/ trouve — creation d\'une galerie vide.');
    fs.writeFileSync(OUTPUT_FILE, 'window.GALLERY = [];\n');
    return;
  }

  const categories = fs.readdirSync(IMAGES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory());

  for (const catDir of categories) {
    const category = catDir.name;
    const categoryPath = path.join(IMAGES_DIR, category);

    const albumDirs = fs.readdirSync(categoryPath, { withFileTypes: true })
      .filter(d => d.isDirectory());

    for (const albumDir of albumDirs) {
      const albumTitle = albumDir.name;
      const albumPath = path.join(categoryPath, albumDir.name);

      const photos = fs.readdirSync(albumPath)
        .filter(isImage)
        .sort()
        .map(file => `images/${category}/${albumDir.name}/${file}`.replace(/ /g, '%20'));

      if (photos.length > 0) {
        albums.push({
          category,
          title: albumTitle,
          cover: photos[0],
          photos
        });
      }
    }
  }

  const output = `window.GALLERY = ${JSON.stringify(albums, null, 2)};\n`;
  fs.writeFileSync(OUTPUT_FILE, output);
  console.log(`Galerie generee : ${albums.length} album(s) trouve(s).`);
  albums.forEach(a => console.log(`  - [${a.category}] ${a.title} (${a.photos.length} photos)`));
}

buildGallery();
