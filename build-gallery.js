// build-gallery.js
// Scanne le dossier /images (structure: images/<categorie>/<nom-album>/*.jpg),
// compresse/redimensionne automatiquement chaque photo pour le web,
// puis genere gallery-data.js, utilise par index.html pour afficher les photos.
// Ce script tourne automatiquement a chaque deploiement Vercel — tu n'as rien a lancer toi-meme.

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const IMAGES_DIR = path.join(__dirname, 'images');
const OPTIMIZED_DIR = path.join(__dirname, 'optimized');
const OUTPUT_FILE = path.join(__dirname, 'gallery-data.js');
const VALID_EXT = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_WIDTH = 1600;
const JPEG_QUALITY = 78;

function isImage(file) {
  return VALID_EXT.includes(path.extname(file).toLowerCase());
}

function toWebPath(p) {
  return p.split(path.sep).join('/').replace(/ /g, '%20');
}

async function compressImage(srcPath, destPath) {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  await sharp(srcPath)
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toFile(destPath);
}

async function buildGallery() {
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

      const files = fs.readdirSync(albumPath).filter(isImage).sort();
      const photos = [];

      for (const file of files) {
        const srcPath = path.join(albumPath, file);
        const outName = path.parse(file).name + '.jpg';
        const outRelPath = path.join('optimized', category, albumDir.name, outName);
        const outAbsPath = path.join(OPTIMIZED_DIR, category, albumDir.name, outName);

        try {
          await compressImage(srcPath, outAbsPath);
          photos.push(toWebPath(outRelPath));
        } catch (err) {
          console.error(`Erreur compression ${srcPath}:`, err.message);
        }
      }

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
  console.log(`Galerie generee : ${albums.length} album(s), photos compressees et redimensionnees.`);
  albums.forEach(a => console.log(`  - [${a.category}] ${a.title} (${a.photos.length} photos)`));
}

buildGallery().catch(err => {
  console.error('Erreur lors de la generation de la galerie:', err);
  process.exit(1);
});
