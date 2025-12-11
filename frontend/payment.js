// payment.js
document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = 'http://localhost:5000';
  const CART_API = API_BASE + '/api/cart';
  const ORDER_API = API_BASE + '/api/orders';
  const PROFILE_API = API_BASE + '/api/users/profile';

  // Auth check
  const user = JSON.parse(localStorage.getItem('kisaanDostUser') || 'null');
  if (!user || !user.token) {
    alert('Please login before checking out.');
    window.location.href = 'index.html';
    return;
  }
  const token = user.token;

  // Elements
  const orderItemsEl = document.getElementById('order-items');
  const subtotalEl = document.getElementById('subtotal');
  const shippingFeeEl = document.getElementById('shipping-fee');
  const grandTotalEl = document.getElementById('grand-total');
  const placeBtn = document.getElementById('place-order-btn');
  const placeMsg = document.getElementById('place-msg');

  const shipName = document.getElementById('ship-name');
  const shipAddress = document.getElementById('ship-address');
  const shipCity = document.getElementById('ship-city');
  const shipState = document.getElementById('ship-state');
  const shipPincode = document.getElementById('ship-pincode');
  const shipCountry = document.getElementById('ship-country');
  const shipPhone = document.getElementById('ship-phone');
  const txnGroup = document.getElementById('txn-group');
  const txnNumber = document.getElementById('txn-number');
  const shippingError = document.getElementById('shipping-error');

  // Payment radios
  const pmCod = document.getElementById('pm-cod');
  const pmUpi = document.getElementById('pm-upi');

  // Toggle txn input
  [pmCod, pmUpi].forEach(r => {
    r.addEventListener('change', () => {
      if (pmUpi.checked) txnGroup.classList.remove('hidden');
      else txnGroup.classList.add('hidden');
    });
  });

  // Simple toast
  function toast(text, t = 1200) {
    const el = document.createElement('div');
    el.textContent = text;
    el.style.position = 'fixed';
    el.style.right = '18px';
    el.style.bottom = '18px';
    el.style.background = '#10b981';
    el.style.color = 'white';
    el.style.padding = '8px 12px';
    el.style.borderRadius = '8px';
    el.style.zIndex = 9999;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), t);
  }

  // Load profile and prefill shipping address if available
  async function loadProfilePrefill() {
    try {
      const res = await fetch(PROFILE_API, { headers: { 'Authorization': `Bearer ${token}` }});
      if (!res.ok) return;
      const profile = await res.json();
      if (profile.name && !shipName.value) shipName.value = profile.name;
      if (profile.address && !shipAddress.value) shipAddress.value = profile.address;
      if (profile.mobileNo && !shipPhone.value) shipPhone.value = profile.mobileNo;
      // (profile may not have city/state separate fields — leave blank)
    } catch (err) {
      console.warn('Profile prefill failed', err);
    }
  }

  // Load cart and render summary
  async function loadCartSummary() {
    orderItemsEl.innerHTML = '<p>Loading summary...</p>';
    try {
      const res = await fetch(CART_API, { headers: { 'Authorization': `Bearer ${token}` }});
      if (!res.ok) throw new Error('Failed to load cart');
      const cart = await res.json();

      if (!Array.isArray(cart) || cart.length === 0) {
        orderItemsEl.innerHTML = '<p>Your cart is empty.</p>';
        subtotalEl.textContent = '₹0.00';
        shippingFeeEl.textContent = '₹0.00';
        grandTotalEl.textContent = '₹0.00';
        placeBtn.disabled = true;
        return;
      }

      // build list
      orderItemsEl.innerHTML = '';
      let subtotal = 0;
      cart.forEach(ci => {
        if (!ci.product) return;
        const prod = ci.product;
        const qty = Number(ci.qty || 1);
        const unit = Number(prod.price || 0);
        const line = unit * qty;
        subtotal += line;

        const div = document.createElement('div');
        div.className = 'flex justify-between';
        div.innerHTML = `<span>${prod.name} x ${qty}</span><span>₹${line.toFixed(2)}</span>`;
        orderItemsEl.appendChild(div);
      });

      // simple shipping policy
      const shippingFee = subtotal >= 200 ? 0 : 10;
      subtotalEl.textContent = `₹${subtotal.toFixed(2)}`;
      shippingFeeEl.textContent = `₹${shippingFee.toFixed(2)}`;
      grandTotalEl.textContent = `₹${(subtotal + shippingFee).toFixed(2)}`;

      placeBtn.disabled = false;
      placeMsg.classList.add('hidden');
    } catch (err) {
      console.error(err);
      orderItemsEl.innerHTML = `<p class="text-red-500">Error loading cart: ${err.message}</p>`;
      placeBtn.disabled = true;
    }
  }

  function validateShipping() {
    shippingError.classList.add('hidden');
    if (!shipName.value.trim()) { shippingError.textContent = 'Name is required'; shippingError.classList.remove('hidden'); return false; }
    if (!shipAddress.value.trim()) { shippingError.textContent = 'Address is required'; shippingError.classList.remove('hidden'); return false; }
    if (!shipCity.value.trim()) { shippingError.textContent = 'City is required'; shippingError.classList.remove('hidden'); return false; }
    if (!shipState.value.trim()) { shippingError.textContent = 'State is required'; shippingError.classList.remove('hidden'); return false; }
    if (!shipPincode.value.trim()) { shippingError.textContent = 'Pincode is required'; shippingError.classList.remove('hidden'); return false; }
    if (!shipCountry.value.trim()) { shippingError.textContent = 'Country is required'; shippingError.classList.remove('hidden'); return false; }
    if (!shipPhone.value.trim()) { shippingError.textContent = 'Phone is required'; shippingError.classList.remove('hidden'); return false; }
    // optional: basic pincode/phone numeric checks
    shippingError.classList.add('hidden');
    return true;
  }

  // Place order
  placeBtn.addEventListener('click', async () => {
    if (!validateShipping()) return;

    // Recalculate totals (trusting previously loaded values)
    const subtotalText = subtotalEl.textContent.replace(/[₹,]/g,'') || '0';
    const shippingText = shippingFeeEl.textContent.replace(/[₹,]/g,'') || '0';
    const total = Number(subtotalText) + Number(shippingText);

    const paymentMethod = pmUpi.checked ? 'UPI' : 'Cash on Delivery';
    const txnRef = txnNumber.value.trim();

    if (paymentMethod === 'UPI' && !txnRef) {
      shippingError.textContent = 'Please enter transaction/UPI reference for online payment.';
      shippingError.classList.remove('hidden');
      return;
    }

    placeBtn.disabled = true;
    placeBtn.textContent = 'Placing order...';

    const shippingAddress = {
      name: shipName.value.trim(),
      address: shipAddress.value.trim(),
      city: shipCity.value.trim(),
      state: shipState.value.trim(),
      pincode: shipPincode.value.trim(),
      country: shipCountry.value.trim(),
      phone: shipPhone.value.trim(),
    };

    const payload = {
      shippingAddress,
      paymentMethod,
      totalPrice: total
    };
    if (paymentMethod === 'UPI') payload.transactionId = txnRef;

    try {
      const res = await fetch(ORDER_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const body = await res.json().catch(()=> ({}));
      if (!res.ok) {
        const msg = body.message || 'Failed to place order';
        placeMsg.textContent = msg;
        placeMsg.classList.remove('hidden');
        placeBtn.disabled = false;
        placeBtn.textContent = 'Place Order';
        return;
      }

      // Success: show toast and redirect to orders
      toastAndRedirect('Order placed successfully!', 'profile.html?tab=orders', 900);

    } catch (err) {
      console.error('Place order error', err);
      placeMsg.textContent = 'Server error placing order';
      placeMsg.classList.remove('hidden');
      placeBtn.disabled = false;
      placeBtn.textContent = 'Place Order';
    }
  });

  function toastAndRedirect(msg, href, delay = 800) {
    const el = document.createElement('div');
    el.textContent = msg;
    el.style.position = 'fixed';
    el.style.right = '18px';
    el.style.bottom = '18px';
    el.style.background = '#10b981';
    el.style.color = 'white';
    el.style.padding = '10px 14px';
    el.style.borderRadius = '8px';
    el.style.zIndex = 9999;
    document.body.appendChild(el);
    setTimeout(() => {
      el.remove();
      window.location.href = href;
    }, delay);
  }

  // init
  document.getElementById('site-year').textContent = new Date().getFullYear();
  loadProfilePrefill();
  loadCartSummary();
});
