// build-gallery.js
// Scanne le dossier /images (structure: images/<categorie>/<nom-album>/*.jpg),
// genere DEUX versions de chaque photo : une miniature legere (grille/apercu)
// et une version qualite complete (zoom plein ecran), puis genere gallery-data.js.
// Ce script tourne automatiquement a chaque deploiement Vercel — tu n'as rien a lancer toi-meme.

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const IMAGES_DIR = path.join(__dirname, 'images');
const OPTIMIZED_DIR = path.join(__dirname, 'optimized');
const OUTPUT_FILE = path.join(__dirname, 'gallery-data.js');
const VALID_EXT = ['.jpg', '.jpeg', '.png', '.webp'];

const FULL_WIDTH = 1600;
const FULL_QUALITY = 78;
const THUMB_WIDTH = 700;
const THUMB_QUALITY = 68;

function isImage(file) {
  return VALID_EXT.includes(path.extname(file).toLowerCase());
}

function toWebPath(p) {
  return p.split(path.sep).join('/').replace(/ /g, '%20');
}

async function makeVersion(srcPath, destPath, width, quality) {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  await sharp(srcPath)
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .jpeg({ quality, mozjpeg: true })
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
      const photos = [];  // qualite complete, pour le zoom plein ecran
      const thumbs = [];  // miniatures legeres, pour la grille et la vue album

      for (const file of files) {
        const srcPath = path.join(albumPath, file);
        const outName = path.parse(file).name + '.jpg';

        const fullRel = path.join('optimized', 'full', category, albumDir.name, outName);
        const fullAbs = path.join(OPTIMIZED_DIR, 'full', category, albumDir.name, outName);
        const thumbRel = path.join('optimized', 'thumb', category, albumDir.name, outName);
        const thumbAbs = path.join(OPTIMIZED_DIR, 'thumb', category, albumDir.name, outName);

        try {
          await makeVersion(srcPath, fullAbs, FULL_WIDTH, FULL_QUALITY);
          await makeVersion(srcPath, thumbAbs, THUMB_WIDTH, THUMB_QUALITY);
          photos.push(toWebPath(fullRel));
          thumbs.push(toWebPath(thumbRel));
        } catch (err) {
          console.error(`Erreur compression ${srcPath}:`, err.message);
        }
      }

      if (photos.length > 0) {
        albums.push({
          category,
          title: albumTitle,
          cover: thumbs[0],
          photos,
          thumbs
        });
      }
    }
  }

  const output = `window.GALLERY = ${JSON.stringify(albums, null, 2)};\n`;
  fs.writeFileSync(OUTPUT_FILE, output);
  console.log(`Galerie generee : ${albums.length} album(s), miniatures + qualite complete generees.`);
  albums.forEach(a => console.log(`  - [${a.category}] ${a.title} (${a.photos.length} photos)`));
}

buildGallery().catch(err => {
  console.error('Erreur lors de la generation de la galerie:', err);
  process.exit(1);
});
