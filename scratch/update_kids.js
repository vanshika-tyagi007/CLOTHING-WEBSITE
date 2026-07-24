const fs = require('fs');
const db = JSON.parse(fs.readFileSync('./public/catalog/database.json', 'utf8'));

const boysItems = [
  'Everyday Polo & Tee Set',
  "Boys' Adventure Tees",
  "Kids' Style Update",
  'Trendy Kids Outfit',
  'Colorful Kids Set',
  'Kids Classic Wear',
  'Trendy Summer Set'
];

const girlsItems = [
  'Striped Swing Dress',
  'Cotton Candy Stripe Dress',
  'Sparkly Party Tutu Dress',
  'Festive Kids Wear',
  'Kids Celebration Set',
  "Kids' Smart Casual Dress",
  'Elegant Kids Outfit',
  'Charming Kids Outfit',
  'Kids Festive Special',
  'Playful Kids Dress',
  'Summer Friends Trio',
  'Sibling Summer Coordinates'
];

db["Kids' Apparel"].forEach(p => {
  if (boysItems.includes(p.name)) {
    p.targetGender = 'Boys';
  } else if (girlsItems.includes(p.name)) {
    p.targetGender = 'Girls';
  } else {
    p.targetGender = 'Both';
  }
});

fs.writeFileSync('./public/catalog/database.json', JSON.stringify(db, null, 2));
console.log('Done mapping kids genders!');
