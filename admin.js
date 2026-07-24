// Tab Switching Logic
const tabs = document.querySelectorAll('.admin-tab-btn');
const sections = document.querySelectorAll('.admin-section');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    sections.forEach(s => s.classList.remove('active'));
    
    tab.classList.add('active');
    document.getElementById(tab.dataset.target).classList.add('active');
  });
});

// --- PRODUCTS LOGIC ---
const categorySelect = document.getElementById('category-select');
const productsTbody = document.getElementById('products-tbody');
const addProductBtn = document.getElementById('open-add-product-btn');
const addProductFormContainer = document.getElementById('add-product-form-container');
const addProductForm = document.getElementById('add-product-form');
const cancelAddProduct = document.getElementById('cancel-add-product');
const togglePricesBtn = document.getElementById('toggle-prices-btn');

let showPrices = false;
if (togglePricesBtn) {
  togglePricesBtn.addEventListener('click', () => {
    showPrices = !showPrices;
    togglePricesBtn.textContent = showPrices ? 'Hide Prices' : 'Show Prices';
    renderProducts();
  });
}

let categoryData = JSON.parse(localStorage.getItem('categoryData')) || {};

if (!localStorage.getItem('pricesWiped_v2')) {
  for (const cat in categoryData) {
    categoryData[cat].forEach(p => { delete p.price; });
  }
  localStorage.setItem('categoryData', JSON.stringify(categoryData));
  localStorage.setItem('pricesWiped_v2', 'true');
}

function renderProducts() {
  const category = categorySelect.value;
  const products = categoryData[category] || [];
  productsTbody.innerHTML = '';

  products.forEach((p, index) => {
    const tr = document.createElement('tr');
    const inStock = p.inStock !== false;
    const stockText = inStock ? 'In Stock' : 'Out of Stock';
    const stockColor = inStock ? '#4CAF50' : '#ff4444';

    tr.innerHTML = `
      <td><img src="${p.image}" alt="${p.name}"></td>
      <td>${p.name}</td>
      <td>${showPrices ? (p.price ? '₹' + p.price : '-') : '***'}</td>
      <td style="color: ${stockColor}; font-weight: bold;">${stockText}</td>
      <td>
        <button class="action-btn toggle-stock-btn" data-index="${index}" title="Toggle Stock Status">📦</button>
        <button class="action-btn edit-product-btn" data-index="${index}" title="Edit Product">✏️</button>
        <button class="action-btn delete-product-btn" data-index="${index}" title="Delete Product">🗑️</button>
      </td>
    `;
    productsTbody.appendChild(tr);
  });

  // Attach event listeners for delete and stock toggle
  document.querySelectorAll('.delete-product-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = e.target.dataset.index;
      if(confirm('Are you sure you want to remove this product?')) {
        categoryData[category].splice(index, 1);
        localStorage.setItem('categoryData', JSON.stringify(categoryData));
        renderProducts();
      }
    });
  });

  document.querySelectorAll('.toggle-stock-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = e.target.dataset.index;
      const currentStock = categoryData[category][index].inStock !== false;
      categoryData[category][index].inStock = !currentStock;
      localStorage.setItem('categoryData', JSON.stringify(categoryData));
      renderProducts();
    });
  });

  document.querySelectorAll('.edit-product-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = e.target.dataset.index;
      const product = categoryData[category][index];
      
      document.getElementById('p-name').value = product.name;
      document.getElementById('p-price').value = product.price || '';
      document.getElementById('p-image').value = product.image;
      document.getElementById('p-desc').value = product.desc || '';
      document.getElementById('p-category').value = category;
      document.getElementById('p-stock').value = product.inStock !== false ? 'true' : 'false';
      
      addProductForm.dataset.editIndex = index;
      document.querySelector('#add-product-form-container h3').textContent = 'Edit Product';
      
      addProductFormContainer.style.display = 'block';
      addProductFormContainer.scrollIntoView({ behavior: 'smooth' });
    });
  });
}

categorySelect.addEventListener('change', renderProducts);

addProductBtn.addEventListener('click', () => {
  addProductForm.reset();
  delete addProductForm.dataset.editIndex;
  document.getElementById('p-category').value = categorySelect.value;
  document.querySelector('#add-product-form-container h3').textContent = 'Add New Product';
  addProductFormContainer.style.display = 'block';
  addProductFormContainer.scrollIntoView({ behavior: 'smooth' });
});

cancelAddProduct.addEventListener('click', () => {
  addProductFormContainer.style.display = 'none';
  addProductForm.reset();
  delete addProductForm.dataset.editIndex;
});

addProductForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const category = document.getElementById('p-category').value;
  const stockVal = document.getElementById('p-stock').value;
  const priceVal = document.getElementById('p-price').value;
  
  const newProduct = {
    name: document.getElementById('p-name').value,
    image: document.getElementById('p-image').value,
    desc: document.getElementById('p-desc').value,
    price: priceVal ? Number(priceVal) : null,
    inStock: stockVal === 'true'
  };

  if (addProductForm.dataset.editIndex !== undefined) {
    const index = addProductForm.dataset.editIndex;
    categoryData[category][index] = { ...categoryData[category][index], ...newProduct };
  } else {
    if(!categoryData[category]) categoryData[category] = [];
    categoryData[category].push(newProduct);
  }

  localStorage.setItem('categoryData', JSON.stringify(categoryData));
  
  addProductForm.reset();
  delete addProductForm.dataset.editIndex;
  addProductFormContainer.style.display = 'none';
  renderProducts();
});

// --- OFFERS LOGIC ---
const offersTbody = document.getElementById('offers-tbody');
const addOfferBtn = document.getElementById('open-add-offer-btn');
const addOfferFormContainer = document.getElementById('add-offer-form-container');
const addOfferForm = document.getElementById('add-offer-form');
const cancelAddOffer = document.getElementById('cancel-add-offer');

let offersData = JSON.parse(localStorage.getItem('offersData')) || [];

function renderOffers() {
  offersTbody.innerHTML = '';
  offersData.forEach((offer, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${offer.title}</td>
      <td>${offer.discount}</td>
      <td>${offer.btnText ? offer.btnText + ' (' + offer.category + ')' : 'None'}</td>
      <td>
        <button class="action-btn edit-offer-btn" data-index="${index}" title="Edit Offer">✏️</button>
        <button class="action-btn delete-offer-btn" data-index="${index}" title="Delete Offer">🗑️</button>
      </td>
    `;
    offersTbody.appendChild(tr);
  });

  document.querySelectorAll('.delete-offer-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = e.target.dataset.index;
      if(confirm('Are you sure you want to remove this offer?')) {
        offersData.splice(index, 1);
        localStorage.setItem('offersData', JSON.stringify(offersData));
        renderOffers();
      }
    });
  });

  document.querySelectorAll('.edit-offer-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = e.target.dataset.index;
      const offer = offersData[index];
      
      document.getElementById('o-title').value = offer.title;
      document.getElementById('o-discount').value = offer.discount;
      document.getElementById('o-desc').value = offer.desc || '';
      document.getElementById('o-btn').value = offer.btnText || '';
      document.getElementById('o-category').value = offer.category || '';
      
      addOfferForm.dataset.editIndex = index;
      document.querySelector('#add-offer-form-container h3').textContent = 'Edit Offer';
      
      addOfferFormContainer.style.display = 'block';
      addOfferFormContainer.scrollIntoView({ behavior: 'smooth' });
    });
  });
}

addOfferBtn.addEventListener('click', () => {
  addOfferForm.reset();
  delete addOfferForm.dataset.editIndex;
  document.querySelector('#add-offer-form-container h3').textContent = 'Add New Offer';
  addOfferFormContainer.style.display = 'block';
  addOfferFormContainer.scrollIntoView({ behavior: 'smooth' });
});

cancelAddOffer.addEventListener('click', () => {
  addOfferFormContainer.style.display = 'none';
  addOfferForm.reset();
  delete addOfferForm.dataset.editIndex;
});

addOfferForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const offerDataObj = {
    title: document.getElementById('o-title').value,
    discount: document.getElementById('o-discount').value,
    desc: document.getElementById('o-desc').value,
    btnText: document.getElementById('o-btn').value || null,
    category: document.getElementById('o-category').value || null
  };
  
  if (addOfferForm.dataset.editIndex !== undefined) {
    const index = addOfferForm.dataset.editIndex;
    offersData[index] = { ...offersData[index], ...offerDataObj };
  } else {
    offersData.push({
      id: 'offer-' + Date.now(),
      ...offerDataObj
    });
  }

  localStorage.setItem('offersData', JSON.stringify(offersData));
  
  addOfferForm.reset();
  delete addOfferForm.dataset.editIndex;
  addOfferFormContainer.style.display = 'none';
  renderOffers();
});

// Initial renders
renderProducts();
renderOffers();

// Logout
const logoutBtn = document.getElementById('admin-logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('isAdmin');
    window.location.href = '/';
  });
}
