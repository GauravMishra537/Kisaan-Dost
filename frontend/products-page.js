document.addEventListener('DOMContentLoaded', () => {

    const API_URL = 'http://localhost:5000/api/products';
    const CART_API_URL = 'http://localhost:5000/api/cart';
    const productsGrid = document.getElementById('products-grid');

    // --- Helper function to generate rating stars ---
    const generateRatingStars = (rating, numReviews) => {
        if (numReviews === 0) {
            return '<span class="text-sm text-gray-500">No reviews yet</span>';
        }
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) stars += '<span class="text-yellow-400">★</span>';
            else stars += '<span class="text-gray-300">★</span>';
        }
        return `<div class="flex items-center">${stars} <span class="text-sm text-gray-600 ml-1">(${numReviews})</span></div>`;
    };

    // --- Helper function to create a product card (UPDATED) ---
    const createProductCard = (product) => {
        
        const isOutOfStock = product.countInStock <= 0;
        
        // ===== NEW CARD HTML =====
        return `
            <div class="bg-white rounded-lg shadow-md overflow-hidden ${isOutOfStock ? 'opacity-60' : 'transform transition-transform hover:scale-105'}">
                <img src="${product.image}" alt="${product.name}" class="w-full h-48 object-cover">
                <div class="p-4">
                    <h3 class="text-xl font-semibold mb-1">${product.name}</h3>
                    <p class="text-lg font-bold text-green-600 mb-2">₹${product.price} / kg</p>
                    <p class="text-sm text-gray-500 mb-2 flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path></svg>
                        ${product.location}
                    </p>
                    ${generateRatingStars(product.rating, product.numReviews)}
                </div>
                <div class="flex justify-between items-center p-4 bg-gray-50 border-t">
                    <span class="text-sm font-medium ${isOutOfStock ? 'text-red-500' : 'text-green-600'}">
                        ${isOutOfStock ? 'Out of Stock' : 'In Stock'}
                    </span>
                    
                    <button class="add-to-cart-btn text-sm font-medium text-white ${isOutOfStock ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} px-3 py-1 rounded-md" 
                            data-id="${product._id}" ${isOutOfStock ? 'disabled' : ''}>
                        Add to Cart
                    </button>
                </div>
            </div>
        `;
    };

    // --- Helper function to fetch and render products ---
    const loadProducts = async (url, gridElementId) => {
        const grid = document.getElementById(gridElementId);
        if (!grid) return;

        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch');
            const products = await res.json();

            grid.innerHTML = ''; // Clear loading text
            if (products.length === 0) {
                grid.innerHTML = '<p class="text-gray-500 col-span-full">No products found in this category.</p>';
                return;
            }
            products.forEach(product => {
                grid.innerHTML += createProductCard(product);
            });
        } catch (error) {
            console.error(error);
            grid.innerHTML = '<p class="text-red-500 col-span-full">Could not load products.</p>';
        }
    };

    // --- MAIN LOADING LOGIC ---
    const pageTitle = document.getElementById('products-title');
    const params = new URLSearchParams(window.location.search);
    const category = params.get('category');

    if (category) {
        pageTitle.innerText = `Fresh ${category}s`;
        loadProducts(`${API_URL}/category/${category}`, 'products-grid');
    } else {
        pageTitle.innerText = 'All Products';
        loadProducts(API_URL, 'products-grid');
    }

    // --- "Add to Cart" click listener (UPDATED) ---
    productsGrid.addEventListener('click', async (e) => {
        if (e.target.classList.contains('add-to-cart-btn')) {
            const user = JSON.parse(localStorage.getItem('kisaanDostUser'));

            if (user) {
                const productId = e.target.dataset.id;
                
                e.target.disabled = true;
                e.target.innerText = 'Adding...';
                
                try {
                    const res = await fetch(CART_API_URL, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${user.token}`
                        },
                        body: JSON.stringify({ productId: productId, qty: 1 }) // Default Qty 1
                    });
                    
                    if (!res.ok) {
                        const data = await res.json();
                        throw new Error(data.message || 'Failed to add item');
                    }
                    
                    alert('Product added to cart!');

                } catch (err) {
                    console.error(err);
                    alert(`Error: ${err.message}`);
                } finally {
                    e.target.disabled = false;
                    e.target.innerText = 'Add to Cart';
                }
            } else {
                alert('Please log in to add items to your cart.');
            }
        }
    });
});
