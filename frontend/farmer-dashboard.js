// farmer-dashboard.js
// Focus: keep existing product add/edit/delete + show product list + cart icon
// No sales view. Does not change backend or stored data.

document.addEventListener('DOMContentLoaded', () => {
  // === 1. GET USER & AUTH ===
  const user = JSON.parse(localStorage.getItem('kisaanDostUser'));
  if (!user || user.userType !== 'Farmer') {
    alert('You are not authorized. Redirecting to home.');
    window.location.href = 'index.html';
    return;
  }
  const token = user.token;
  const API_URL = 'http://localhost:5000/api/products'; // unchanged

  // === 2. GET ELEMENTS ===
  const addProductSection = document.getElementById('add-product-section');
  const viewProductsSection = document.getElementById('view-products-section');
  const showAddFormBtn = document.getElementById('show-add-form-btn');
  const showViewListBtn = document.getElementById('show-view-list-btn');
  const productForm = document.getElementById('product-form');
  const formTitle = document.getElementById('form-title');
  const submitButton = document.getElementById('submit-button');
  const cancelEditButton = document.getElementById('cancel-edit-button');
  const productListContainer = document.getElementById('product-list-container');

  const productIdField = document.getElementById('product-id');
  const nameField = document.getElementById('name');
  const priceField = document.getElementById('price');
  const imageField = document.getElementById('image');
  const locationField = document.getElementById('location');
  const categoryField = document.getElementById('category');
  const countInStockField = document.getElementById('countInStock');

  // === 3. TOGGLE FUNCTIONS ===
  const showAddForm = () => {
    addProductSection.classList.remove('hidden');
    viewProductsSection.classList.add('hidden');
    showAddFormBtn.classList.replace('bg-gray-200', 'bg-green-600');
    showAddFormBtn.classList.replace('text-gray-700', 'text-white');
    showViewListBtn.classList.replace('bg-green-600', 'bg-gray-200');
    showViewListBtn.classList.replace('text-white', 'text-gray-700');
  };

  const showViewList = () => {
    addProductSection.classList.add('hidden');
    viewProductsSection.classList.remove('hidden');
    showViewListBtn.classList.replace('bg-gray-200', 'bg-green-600');
    showViewListBtn.classList.replace('text-gray-700', 'text-white');
    showAddFormBtn.classList.replace('bg-green-600', 'bg-gray-200');
    showAddFormBtn.classList.replace('text-white', 'text-gray-700');
  };

  showAddFormBtn.addEventListener('click', () => {
    resetForm();
    showAddForm();
  });

  showViewListBtn.addEventListener('click', () => {
    loadProducts();
    showViewList();
  });

  // === 4. Helper: rating fallback (keeps same look as before) ===
  const generateRatingStars = (rating, numReviews) => {
    if (!numReviews || numReviews === 0) return '<span class="text-sm text-gray-500">No reviews yet</span>';
    let stars = '';
    for (let i = 1; i <= 5; i++) {
      stars += (i <= rating) ? '<span class="text-yellow-400">★</span>' : '<span class="text-gray-300">★</span>';
    }
    return `<div class="flex items-center">${stars} <span class="text-sm text-gray-600 ml-1">(${numReviews})</span></div>`;
  };

  // === 5. Load products (calls your existing endpoint /myproducts) ===
  const loadProducts = async () => {
    try {
      productListContainer.innerHTML = '<p id="loading-text" class="text-gray-700 text-lg">Loading your products...</p>';
      const res = await fetch(`${API_URL}/myproducts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Could not fetch products.');
      const products = await res.json();

      productListContainer.innerHTML = '';

      if (!Array.isArray(products) || products.length === 0) {
        const noProductsEl = document.createElement('div');
        noProductsEl.innerText = 'You have not listed any products yet.';
        noProductsEl.className = 'text-gray-700 text-lg sm:col-span-2 lg:col-span-3 xl:col-span-4 p-4 bg-white rounded-lg shadow';
        productListContainer.appendChild(noProductsEl);
        return;
      }

      products.forEach(product => {
        const productElement = document.createElement('div');
        productElement.className = 'bg-white rounded-lg shadow-md overflow-hidden transform transition-transform hover:scale-105';

        productElement.innerHTML = `
          <img src="${product.image}" alt="${product.name}" class="w-full h-48 object-cover">
          <div class="p-4">
            <h3 class="text-xl font-semibold mb-1">${product.name}</h3>
            <p class="text-lg font-bold text-green-600 mb-2">₹${product.price} / kg</p>
            <p class="text-sm font-medium ${product.countInStock > 0 ? 'text-green-600' : 'text-red-500'} mb-2">
              ${product.countInStock > 0 ? `${product.countInStock} kg in stock` : 'Out of Stock'}
            </p>
            <p class="text-sm text-gray-500 mb-2 flex items-center">
              <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path></svg>
              ${product.location || ''}
            </p>
            ${generateRatingStars(product.rating || 0, product.numReviews || 0)}
          </div>
          <div class="flex justify-between p-4 bg-gray-50 border-t">
            <button class="edit-btn text-sm font-medium text-blue-600 hover:text-blue-800"
                    data-id="${product._id}"
                    data-name="${product.name}"
                    data-price="${product.price}"
                    data-image="${product.image}"
                    data-location="${product.location || ''}"
                    data-category="${product.category || ''}"
                    data-stock="${product.countInStock || 0}"> Edit Details
            </button>
            <button class="delete-btn text-sm font-medium text-red-600 hover:text-red-800" data-id="${product._id}">
              Delete Product
            </button>
          </div>
        `;
        productListContainer.appendChild(productElement);
      });

    } catch (error) {
      console.error(error);
      productListContainer.innerHTML = '<p class="text-red-500 p-4 bg-white rounded-lg">Error loading products.</p>';
    }
  };

  // === 6. Reset form ===
  const resetForm = () => {
    formTitle.innerText = 'List New Product';
    submitButton.innerText = 'Add Product';
    cancelEditButton.classList.add('hidden');
    productForm.reset();
    productIdField.value = '';
  };

  // === 7. Form submit: Add or Edit product ===
  productForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = nameField.value.trim();
    const price = priceField.value;
    const image = imageField.value.trim();
    const location = locationField.value.trim();
    const category = categoryField.value;
    const countInStock = countInStockField.value;
    const productId = productIdField.value;

    if (!category) {
      alert('Please select a category.');
      return;
    }

    const isEditing = !!productId;
    const url = isEditing ? `${API_URL}/${productId}` : API_URL;
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, price, image, location, category, countInStock })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to save product');
      }

      alert(`Product ${isEditing ? 'updated' : 'added'} successfully!`);
      resetForm();
      loadProducts();
      showViewList();
    } catch (error) {
      console.error(error);
      alert(`Error: ${error.message}`);
    }
  });

  // === 8. Cancel edit ===
  cancelEditButton.addEventListener('click', resetForm);

  // === 9. Delegated click handling for edit/delete ===
  productListContainer.addEventListener('click', async (e) => {
    // DELETE
    if (e.target.classList.contains('delete-btn')) {
      const id = e.target.dataset.id;
      if (!confirm('Are you sure you want to delete this product?')) return;
      try {
        const res = await fetch(`${API_URL}/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to delete product.');
        alert('Product deleted successfully!');
        loadProducts();
      } catch (error) {
        console.error(error);
        alert(`Error: ${error.message}`);
      }
    }

    // EDIT
    if (e.target.classList.contains('edit-btn')) {
      const id = e.target.dataset.id;
      const name = e.target.dataset.name;
      const price = e.target.dataset.price;
      const image = e.target.dataset.image;
      const location = e.target.dataset.location;
      const category = e.target.dataset.category;
      const stock = e.target.dataset.stock;

      formTitle.innerText = 'Edit Product';
      submitButton.innerText = 'Update Product';
      cancelEditButton.classList.remove('hidden');

      productIdField.value = id;
      nameField.value = name;
      priceField.value = price;
      imageField.value = image;
      locationField.value = location;
      categoryField.value = category;
      countInStockField.value = stock;

      showAddForm();
      productForm.scrollIntoView({ behavior: 'smooth' });
    }
  });

  // === 10. Initial load ===
  loadProducts();
  showViewList();
});
