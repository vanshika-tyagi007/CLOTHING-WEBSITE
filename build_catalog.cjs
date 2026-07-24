const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

async function downloadFile(url, targetPath) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        const file = fs.createWriteStream(targetPath);
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      } else {
        reject(new Error(`Failed to download, status code: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      reject(err);
    });
  });
}

function getHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

async function buildCatalog() {
  const catalogDir = path.join(__dirname, 'public', 'catalog');
  if (!fs.existsSync(catalogDir)) {
    fs.mkdirSync(catalogDir, { recursive: true });
  }

  const rawData = fs.readFileSync('temp_catalog.json', 'utf8');
  // Use Function to evaluate the JS object since it's not strict JSON
  const data = (new Function('return ' + rawData))();

  let totalItems = 0;
  let processedItems = 0;

  for (const category in data) {
    totalItems += data[category].length;
  }

  for (const category in data) {
    const items = data[category];
    for (const item of items) {
      let imageSrc = item.image;
      if (!imageSrc) continue;

      let filename = '';
      let targetPath = '';

      if (imageSrc.startsWith('http')) {
        // External URL
        const extMatch = imageSrc.match(/\.(png|jpg|jpeg|webp)/i);
        let ext = extMatch ? extMatch[1] : 'jpg';
        filename = `${slugify(item.name)}.${ext}`;
        targetPath = path.join(catalogDir, filename);

        console.log(`Downloading ${imageSrc} to ${targetPath}`);
        try {
          await downloadFile(imageSrc, targetPath);
        } catch (e) {
          console.error(`Failed to download ${imageSrc}: ${e.message}`);
          continue;
        }
      } else {
        // Local file
        // Handle paths like /mens_wear.png, mens_wear.png
        let cleanPath = imageSrc.startsWith('/') ? imageSrc.substring(1) : imageSrc;
        
        let localLocations = [
          path.join(__dirname, 'public', cleanPath),
          path.join(__dirname, cleanPath),
          path.join(__dirname, 'src', 'assets', cleanPath)
        ];

        let foundPath = null;
        for (const loc of localLocations) {
          if (fs.existsSync(loc)) {
            foundPath = loc;
            break;
          }
        }

        if (foundPath) {
          filename = path.basename(foundPath);
          targetPath = path.join(catalogDir, filename);
          console.log(`Copying local file ${foundPath} to ${targetPath}`);
          fs.copyFileSync(foundPath, targetPath);
        } else {
          console.error(`Could not find local file for ${imageSrc}`);
          continue;
        }
      }

      // Compute hash
      const hash = getHash(targetPath);
      item.imageHash = hash;
      item.image = '/catalog/' + filename;

      processedItems++;
      console.log(`Processed ${processedItems}/${totalItems}`);
    }
  }

  // Save database.json
  const dbPath = path.join(catalogDir, 'database.json');
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  console.log('Catalog built successfully!');
}

buildCatalog().catch(console.error);
