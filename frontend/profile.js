// profile.js
// Ensures only changed fields are sent when updating profile, preserving other server data.

document.addEventListener('DOMContentLoaded', () => {
    // Validate local storage user
    const stored = localStorage.getItem('kisaanDostUser');
    if (!stored) {
        alert('You must be logged in to view this page.');
        window.location.href = 'index.html';
        return;
    }

    const currentUser = JSON.parse(stored);
    const token = currentUser.token;
    if (!token) {
        alert('Invalid session. Please login again.');
        localStorage.removeItem('kisaanDostUser');
        window.location.href = 'index.html';
        return;
    }

    // API base
    const API_BASE = ''; // same origin; set to 'http://localhost:5000' if required

    // Elements & tabs
    const tabs = {
        cart: { btn: document.getElementById('cart-tab'), content: document.getElementById('cart-content') },
        orders: { btn: document.getElementById('orders-tab'), content: document.getElementById('orders-content') },
        info: { btn: document.getElementById('info-tab'), content: document.getElementById('info-content') }
    };
    const allTabBtns = document.querySelectorAll('.tab-btn');
    const allTabContents = document.querySelectorAll('.tab-content');

    const cartItemsContainer = document.getElementById('cart-items-container');
    const cartTotalEl = document.getElementById('cart-total');
    const profileForm = document.getElementById('profile-form');
    const logoutButton = document.getElementById('logout-button');
    const deactivateButton = document.getElementById('deactivate-button');
    const ordersContainer = document.getElementById('orders-container');
    const profileMsg = document.getElementById('profile-msg');

    const bankSection = document.getElementById('bank-section');

    // Helpers
    const show = (el) => el && el.classList.remove('hidden');
    const hide = (el) => el && el.classList.add('hidden');
    const setMsg = (text, isError = true) => {
        if (!profileMsg) return;
        profileMsg.textContent = text || '';
        profileMsg.classList.toggle('hidden', !text);
        profileMsg.style.color = isError ? '#dc2626' : '#059669';
    };

    // Tab switcher
    function switchTab(tabName) {
        allTabContents.forEach(c => c.classList.add('hidden'));
        allTabBtns.forEach(b => {
            b.classList.remove('bg-green-600');
            b.classList.remove('text-white');
            b.classList.remove('font-semibold');
            b.classList.add('text-gray-600');
        });

        if (tabs[tabName]) {
            const { btn, content } = tabs[tabName];
            content.classList.remove('hidden');
            if (btn) {
                btn.classList.add('bg-green-600');
                btn.classList.add('text-white');
                btn.classList.add('font-semibold');
                btn.classList.remove('text-gray-600');
            }
        }
    }

    Object.keys(tabs).forEach(name => {
        const t = tabs[name];
        if (t.btn) t.btn.addEventListener('click', () => switchTab(name));
    });

    // Which tab to open by query param
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'settings' || tabParam === 'info') switchTab('info');
    else if (tabParam === 'orders') switchTab('orders');
    else switchTab('cart');

    // Store the original server profile so we only send changed fields
    let originalUser = null;

    // Load cart
    async function loadCart() {
        try {
            const res = await fetch(`${API_BASE}/api/cart`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to load cart');
            const cartItems = await res.json();
            cartItemsContainer.innerHTML = '';
            let total = 0;
            let disableCheckout = false;

            if (!cartItems || cartItems.length === 0) {
                cartItemsContainer.innerHTML = '<p>Your cart is empty.</p>';
                disableCheckout = true;
            } else {
                cartItems.forEach(item => {
                    if (!item.product) return;
                    const itemTotal = (item.product.price || 0) * (item.qty || 0);
                    total += itemTotal;
                    const stockWarning = (item.product.countInStock < item.qty)
                        ? `<p class="text-xs text-red-500">Only ${item.product.countInStock} available. Please adjust.</p>`
                        : '';
                    if (item.product.countInStock < item.qty) disableCheckout = true;

                    const itemEl = document.createElement('div');
                    itemEl.className = 'flex items-center justify-between p-4 border rounded';
                    itemEl.innerHTML = `
                        <div class="flex items-center space-x-4">
                            <img src="${item.product.image || ''}" alt="${item.product.name || ''}" class="w-16 h-16 object-cover rounded">
                            <div>
                                <h3 class="text-lg font-semibold">${item.product.name || ''}</h3>
                                <p class="text-gray-600">₹${item.product.price || 0} x ${item.qty}</p>
                                ${stockWarning}
                            </div>
                        </div>
                        <div class="flex items-center space-x-4">
                            <span class="text-lg font-semibold">₹${itemTotal.toFixed(2)}</span>
                            <button class="remove-from-cart-btn text-red-500 hover:text-red-700" data-id="${item.product._id}">
                                Remove
                            </button>
                        </div>
                    `;
                    cartItemsContainer.appendChild(itemEl);
                });
            }

            cartTotalEl.innerHTML = `
                <h3 class="text-2xl font-bold">Total: ₹${total.toFixed(2)}</h3>
                <button id="checkout-button" 
                        class="mt-4 px-6 py-2 text-white font-semibold rounded-lg shadow ${disableCheckout ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}"
                        ${disableCheckout ? 'disabled' : ''}>
                    ${disableCheckout ? 'Adjust items in cart' : 'Proceed to Checkout'}
                </button>
            `;
        } catch (err) {
            console.error('loadCart error', err);
            cartItemsContainer.innerHTML = '<p class="text-red-500">Error loading cart.</p>';
        }
    }

    // Load orders
    async function loadOrders() {
        try {
            const res = await fetch(`${API_BASE}/api/orders/myorders`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to load orders');
            const orders = await res.json();
            if (!orders || orders.length === 0) {
                ordersContainer.innerHTML = '<p>You have no past orders.</p>';
                return;
            }
            let html = '<div class="space-y-6">';
            orders.forEach(order => {
                const orderDate = new Date(order.createdAt).toLocaleString();
                html += `
                    <div class="bg-gray-50 p-4 rounded-lg shadow-sm border">
                        <div class="flex justify-between items-center mb-2">
                            <span class="font-semibold text-gray-700">Order ID: ${order._id}</span>
                            <span class="text-sm text-gray-500">Placed on: ${orderDate}</span>
                        </div>
                        <p class="text-sm text-gray-600 mb-2">Address: ${order.shippingAddress?.address || ''}</p>
                        <hr class="my-2">
                        <div class="space-y-2">
                `;
                (order.orderItems || []).forEach(item => {
                    html += `
                        <div class="flex items-center justify-between">
                            <div class="flex items-center">
                                <img src="${item.image || ''}" alt="${item.name || ''}" class="w-10 h-10 object-cover rounded mr-3">
                                <span>${item.name} (Qty: ${item.qty})</span>
                            </div>
                            <span class="font-medium">₹${((item.price||0) * (item.qty||0)).toFixed(2)}</span>
                        </div>
                    `;
                });
                html += `
                        </div>
                        <hr class="my-2">
                        <div class="text-right">
                            <span class="text-xl font-bold text-gray-800">Total: ₹${(order.totalPrice||0).toFixed(2)}</span>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            ordersContainer.innerHTML = html;
        } catch (err) {
            console.error('loadOrders error', err);
            ordersContainer.innerHTML = '<p class="text-red-500">Error loading orders.</p>';
        }
    }

    // Load profile and populate form, store original
    async function loadProfile() {
        try {
            const res = await fetch(`${API_BASE}/api/users/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to load profile');
            const user = await res.json();
            originalUser = user || {};

            // Populate fields
            document.getElementById('name').value = user.name || '';
            document.getElementById('email').value = user.email || '';
            document.getElementById('mobileNo').value = user.mobileNo || '';
            // address: if structuredAddress present, build a single string; else use address
            if (user.structuredAddress && user.structuredAddress.line1) {
                const a = user.structuredAddress;
                const parts = [a.line1, a.line2, a.city, a.state, a.pincode, a.country].filter(Boolean);
                document.getElementById('address').value = parts.join(', ');
            } else {
                document.getElementById('address').value = user.address || '';
            }

            // Bank details (only show for Farmers)
            if (user.userType === 'Farmer') {
                show(bankSection);
                document.getElementById('bank-account-name').value = user.bankDetails?.accountName || '';
                document.getElementById('bank-account-number').value = user.bankDetails?.accountNumber || '';
                document.getElementById('bank-ifsc').value = user.bankDetails?.ifsc || '';
                document.getElementById('bank-name').value = user.bankDetails?.bankName || '';
                document.getElementById('bank-upi').value = user.bankDetails?.upi || '';
            } else {
                hide(bankSection);
            }

            // Security question (do not pre-fill answer)
            document.getElementById('security-question').value = user.securityQuestion || '';
            document.getElementById('security-answer').value = '';

        } catch (err) {
            console.error('loadProfile error', err);
            setMsg('Error loading profile. Please try again later.');
        }
    }

    // Update profile: only send fields that changed or are explicitly provided
    profileForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        setMsg('', false);

        if (!originalUser) return setMsg('Profile not loaded yet.');

        // Collect current form values
        const name = document.getElementById('name').value.trim();
        const mobileNo = document.getElementById('mobileNo').value.trim();
        const addressVal = document.getElementById('address').value.trim();
        const password = document.getElementById('password').value;
        const securityQuestion = document.getElementById('security-question').value;
        const securityAnswer = document.getElementById('security-answer').value;

        // Build payload with only changed fields
        const payload = {};

        if (name && name !== (originalUser.name || '')) payload.name = name;
        if (mobileNo !== (originalUser.mobileNo || '')) payload.mobileNo = mobileNo;

        // Address handling: if structuredAddress present originally we won't try to split; just store the freeform address string
        if (addressVal !== (originalUser.address || '') &&
            addressVal !== (() => {
                if (originalUser.structuredAddress && originalUser.structuredAddress.line1) {
                    const a = originalUser.structuredAddress;
                    return [a.line1, a.line2, a.city, a.state, a.pincode, a.country].filter(Boolean).join(', ');
                }
                return originalUser.address || '';
            })()
        ) {
            payload.address = addressVal;
        }

        if (password && password.length > 0) payload.password = password;

        // Security question/answer: send if question chosen (even if same) and answer provided
        if (securityQuestion) payload.securityQuestion = securityQuestion;
        if (securityAnswer && securityAnswer.length > 0) payload.securityAnswer = securityAnswer;

        // Bank details for farmers: include if any value present or changed
        if (originalUser.userType === 'Farmer') {
            const bankDetails = {
                accountName: document.getElementById('bank-account-name').value.trim(),
                accountNumber: document.getElementById('bank-account-number').value.trim(),
                ifsc: document.getElementById('bank-ifsc').value.trim(),
                bankName: document.getElementById('bank-name').value.trim(),
                upi: document.getElementById('bank-upi').value.trim()
            };
            // If any of the bank fields provided, include the object (so farmer can set/update)
            const anyBankValue = Object.values(bankDetails).some(v => v && v.length > 0);
            if (anyBankValue) payload.bankDetails = bankDetails;
        }

        if (Object.keys(payload).length === 0) {
            setMsg('No changes detected.', false);
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/users/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const body = await res.json().catch(() => null);

            if (!res.ok) {
                console.error('update failed', body);
                setMsg(body?.message || 'Failed to update profile.');
                return;
            }

            // Success: update originalUser with returned values (server returns updated user info ideally)
            // If server returns limited data, merge local payload
            const updated = body && typeof body === 'object' ? body : {};
            originalUser = { ...(originalUser || {}), ...updated, ...payload };

            // Update localStorage user name (token may remain same)
            try {
                const stored = JSON.parse(localStorage.getItem('kisaanDostUser') || '{}');
                if (stored) {
                    stored.name = originalUser.name || stored.name;
                    localStorage.setItem('kisaanDostUser', JSON.stringify(stored));
                }
            } catch (err) {
                console.warn('Could not update localStorage user name', err);
            }

            // clear sensitive inputs
            document.getElementById('password').value = '';
            document.getElementById('security-answer').value = '';

            setMsg('Profile updated successfully.', false);

        } catch (err) {
            console.error('update profile error', err);
            setMsg('Server error while updating profile.');
        }
    });

    // Remove item from cart UI handler (delegated)
    cartItemsContainer?.addEventListener('click', async (e) => {
        if (e.target.classList.contains('remove-from-cart-btn')) {
            const productId = e.target.dataset.id;
            if (!productId) return;
            if (!confirm('Remove this item from cart?')) return;
            try {
                const res = await fetch(`${API_BASE}/api/cart/${productId}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!res.ok) throw new Error('Failed to remove');
                alert('Item removed from cart.');
                loadCart();
            } catch (err) {
                console.error('remove from cart error', err);
                alert('Could not remove item.');
            }
        }
    });

    // Checkout button navigate
    cartTotalEl?.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'checkout-button') {
            window.location.href = 'payment.html';
        }
    });

    // Deactivate account
    deactivateButton?.addEventListener('click', async () => {
        if (!confirm('This will permanently delete your account. Continue?')) return;
        try {
            const res = await fetch(`${API_BASE}/api/users/profile`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) {
                const b = await res.json().catch(() => null);
                throw new Error(b?.message || 'Failed to deactivate');
            }
            localStorage.removeItem('kisaanDostUser');
            alert('Account deactivated.');
            window.location.href = 'index.html';
        } catch (err) {
            console.error('deactivate error', err);
            alert('Could not deactivate account.');
        }
    });

    // Logout
    logoutButton?.addEventListener('click', () => {
        localStorage.removeItem('kisaanDostUser');
        alert('You have been logged out.');
        window.location.href = 'index.html';
    });

    // Initial load
    loadCart();
    loadProfile();
    loadOrders();
});
