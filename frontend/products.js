// product.js
document.addEventListener('DOMContentLoaded', () => {

    const API_URL = 'http://localhost:5000/api/products';
    const CART_API_URL = 'http://localhost:5000/api/cart';
    const productsGrid = document.getElementById('products-grid');

    // small toast helper (non-blocking)
    function showToast(msg, duration = 1200) {
        const el = document.createElement('div');
        el.textContent = msg;
        el.style.position = 'fixed';
        el.style.right = '20px';
        el.style.bottom = '20px';
        el.style.background = '#10b981';
        el.style.color = 'white';
        el.style.padding = '8px 12px';
        el.style.borderRadius = '6px';
        el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        el.style.zIndex = 9999;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), duration);
    }

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
        
        const isOutOfStock = !product.countInStock || product.countInStock <= 0;
        
        // ===== NEW CARD HTML =====
        return `
            <div class="bg-white rounded-lg shadow-md overflow-hidden ${isOutOfStock ? 'opacity-60' : 'transform transition-transform hover:scale-105'}">
                <img src="${product.image}" alt="${product.name}" class="w-full h-48 object-cover">
                <div class="p-4">
                    <h3 class="text-xl font-semibold mb-1">${product.name}</h3>
                    <p class="text-lg font-bold text-green-600 mb-2">₹${product.price} / kg</p>
                    <p class="text-sm text-gray-500 mb-2 flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path></svg>
                        ${product.location || ''}
                    </p>
                    ${generateRatingStars(product.rating || 0, product.numReviews || 0)}
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
            if (!Array.isArray(products) || products.length === 0) {
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
        if (pageTitle) pageTitle.innerText = `Fresh ${category}s`;
        loadProducts(`${API_URL}/category/${category}`, 'products-grid');
    } else {
        if (pageTitle) pageTitle.innerText = 'All Products';
        loadProducts(API_URL, 'products-grid');
    }

    // --- "Add to Cart" click listener (UPDATED) ---
    productsGrid.addEventListener('click', async (e) => {
        // find the actual button (covers inner elements)
        let target = e.target;
        // if clicked child element inside button, find closest .add-to-cart-btn
        const btn = target.closest && target.closest('.add-to-cart-btn') ? target.closest('.add-to-cart-btn') : (target.classList && target.classList.contains('add-to-cart-btn') ? target : null);
        if (!btn) return;

        const user = JSON.parse(localStorage.getItem('kisaanDostUser'));

        if (user) {
            const productId = btn.dataset.id;
            
            btn.disabled = true;
            const prevText = btn.innerText;
            btn.innerText = 'Adding...';
            
            try {
                // send qty:1; backend will increment existing qty if item found
                const res = await fetch(CART_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${user.token}`
                    },
                    body: JSON.stringify({ productId: productId, qty: 1 })
                });
                
                const data = await res.json().catch(()=> ({}));

                if (!res.ok) {
                    // backend returns helpful message (e.g., stock limit)
                    const message = data.message || 'Failed to add item';
                    showToast(message, 1800);
                    console.error('Add to cart failed:', data);
                } else {
                    // success: show toast (no blocking alert)
                    showToast('Added to cart');
                    // optional: update cart-count element if you have one
                    const headerCartCount = document.getElementById('header-cart-count');
                    if (headerCartCount && Array.isArray(data)) {
                        // if backend returns populated cart array
                        const qty = data.reduce((s, i) => s + (i.qty || 0), 0);
                        headerCartCount.textContent = qty;
                    } else {
                        // try refresh count from server
                        try {
                            const qres = await fetch(CART_API_URL, {
                                headers: { 'Authorization': `Bearer ${user.token}` }
                            });
                            if (qres.ok) {
                                const cartArr = await qres.json();
                                if (Array.isArray(cartArr) && headerCartCount) {
                                    headerCartCount.textContent = cartArr.reduce((s, i) => s + (i.qty || 0), 0);
                                }
                            }
                        } catch (_) { /* ignore */ }
                    }
                }

            } catch (err) {
                console.error(err);
                showToast('Error adding to cart', 1800);
            } finally {
                btn.disabled = false;
                btn.innerText = prevText;
            }
        } else {
            showToast('Please log in to add items to your cart', 1400);
        }
    });
});
