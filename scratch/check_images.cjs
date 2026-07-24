const fs = require('fs');
const db = JSON.parse(fs.readFileSync('./public/catalog/database.json', 'utf8'));
const items = ["Kids' Style Update", 'Trendy Kids Outfit', 'Colorful Kids Set', 'Kids Classic Wear', 'Trendy Summer Set'];
const results = db["Kids' Apparel"].filter(i => items.includes(i.name)).map(i => i.name + ' : ' + i.image);
console.log(results);
