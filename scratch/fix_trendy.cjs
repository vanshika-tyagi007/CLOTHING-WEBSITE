const fs = require('fs');
const db = JSON.parse(fs.readFileSync('./public/catalog/database.json', 'utf8'));

db["Kids' Apparel"].forEach(p => {
  if (p.name === 'Trendy Summer Set') {
    p.targetGender = 'Girls';
  }
});

fs.writeFileSync('./public/catalog/database.json', JSON.stringify(db, null, 2));
console.log('Fixed Trendy Summer Set gender!');
