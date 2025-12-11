// admin.js (updated) - replace your existing file with this
document.addEventListener('DOMContentLoaded', () => {
  const API = 'http://localhost:5000/api/admin';
  const ORDER_API = 'http://localhost:5000/api/orders';
  const PRODUCTS_API = 'http://localhost:5000/api/products';

  const user = JSON.parse(localStorage.getItem('kisaanDostUser'));
  if (!user || !user.token || !user.isAdmin) {
    alert("Admin access required.");
    window.location.href = "index.html";
    return;
  }

  const token = user.token;

  // Elements
  const usersContainer = document.getElementById('users-container');
  const farmersContainer = document.getElementById('farmers-container');
  const ordersContainer = document.getElementById('orders-container');
  const filterSelect = document.getElementById('order-status-filter');

  // Tab switching
  const tabButtons = document.querySelectorAll(".admin-tab-btn");
  const tabPages = document.querySelectorAll(".admin-tab");

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      tabPages.forEach(p => p.classList.add("hidden"));
      document.getElementById(`tab-${tab}`).classList.remove("hidden");

      tabButtons.forEach(x => x.classList.remove("bg-green-600", "text-white"));
      btn.classList.add("bg-green-600", "text-white");

      if (tab === "users") loadUsers();
      if (tab === "farmers") loadFarmers();
      if (tab === "orders") loadOrders();
    });
  });

  // Logout
  document.getElementById("logout-btn").addEventListener("click", () => {
    localStorage.removeItem("kisaanDostUser");
    window.location.href = "index.html";
  });

  // ---------- Modal helper ----------
  function showModal(title, innerHTML) {
    // if modal exists remove
    const existing = document.getElementById('admin-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'admin-modal';
    modal.style.zIndex = 9999;
    modal.innerHTML = `
      <div class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4">
        <div class="bg-white rounded-lg shadow-xl max-h-[80vh] overflow-auto w-full max-w-3xl">
          <div class="flex items-center justify-between px-4 py-3 border-b">
            <h3 class="text-lg font-semibold">${title}</h3>
            <button id="admin-modal-close" class="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300">Close</button>
          </div>
          <div id="admin-modal-body" class="p-4">${innerHTML}</div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('admin-modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (ev) => {
      if (ev.target === modal) modal.remove();
    });
  }

  // ---------- UTIL: fetch JSON with auth ----------
  async function authFetch(url, opts = {}) {
    opts.headers = opts.headers || {};
    opts.headers.Authorization = `Bearer ${token}`;
    if (!opts.headers['Content-Type'] && opts.body) opts.headers['Content-Type'] = 'application/json';
    const res = await fetch(url, opts);
    // if 401/403 you may want to redirect, but for admin panel we just throw
    if (res.status === 401 || res.status === 403) {
      alert('Session expired or not authorized. Please login again.');
      localStorage.removeItem('kisaanDostUser');
      window.location.href = 'index.html';
      throw new Error('Unauthorized');
    }
    return res;
  }

  // ===== LOAD USERS =====
  async function loadUsers() {
    usersContainer.innerHTML = "Loading...";
    const res = await authFetch(`${API}/users`);
    const data = await res.json();

    usersContainer.innerHTML = "";
    data.users.forEach(u => {
      const box = document.createElement("div");
      box.className = "border p-4 rounded shadow flex items-start justify-between";
      box.innerHTML = `
        <div>
          <p><strong>${u.name}</strong> (${u.email})</p>
          <p>User Type: ${u.userType}</p>
          <p>Status: ${u.isBlocked ? '<span class="text-red-600 font-bold">BLOCKED</span>' : '<span class="text-green-600 font-bold">Active</span>'}</p>
          <div class="flex space-x-3 mt-3">
            <button class="block-btn px-3 py-1 bg-red-600 text-white rounded" data-id="${u._id}">
              ${u.isBlocked ? "Unblock" : "Block"}
            </button>
            <button class="view-purchases-btn px-3 py-1 bg-indigo-600 text-white rounded" data-id="${u._id}">
              View Purchases
            </button>
          </div>
        </div>
      `;
      usersContainer.appendChild(box);
    });
  }

  // Block / Unblock / View Purchases
  usersContainer.addEventListener("click", async (e) => {
    const id = e.target.dataset.id;
    if (!id) return;

    if (e.target.classList.contains("block-btn")) {
      const action = e.target.innerText.includes("Unblock") ? "unblock" : "block";
      await authFetch(`${API}/users/${id}/${action}`, { method: "PUT" });
      loadUsers();
    }

    if (e.target.classList.contains("view-purchases-btn")) {
      // fetch admin orders and filter by user id
      try {
        const res = await authFetch(`${API}/orders`); // admin orders endpoint
        const body = await res.json();
        const orders = body.orders || [];
        const userOrders = orders.filter(o => o.user && (o.user._id === id || o.user._id === o.user._id && o.user._id === id || o.user._id === String(id) || (o.user._id && o.user._id.toString() === id)));
        // Build purchases HTML (aggregate items)
        if (!userOrders.length) {
          showModal('Purchases', `<p>No purchases found for this user.</p>`);
          return;
        }
        let html = `<div class="space-y-4">`;
        userOrders.forEach(o => {
          const orderDate = new Date(o.createdAt).toLocaleString();
          const itemsHTML = (o.orderItems || []).map(it => `<li>${it.name} (x${it.qty}) — ₹${it.price}</li>`).join('');
          html += `
            <div class="border p-3 rounded">
              <div class="flex justify-between">
                <div><strong>Order:</strong> ${o._id} <div class="text-sm text-gray-500">Placed: ${orderDate}</div></div>
                <div class="text-right"><div class="font-semibold">₹${(o.totalPrice||o.itemsPrice||0).toFixed(2)}</div></div>
              </div>
              <div class="mt-2"><strong>Items:</strong><ul class="ml-4 list-disc mt-1">${itemsHTML}</ul></div>
              <div class="mt-2 text-sm"><strong>Status:</strong> ${o.status || 'Pending'} ${o.trackingNumber ? `<br><strong>Tracking:</strong> ${o.trackingNumber}` : ''}</div>
            </div>
          `;
        });
        html += `</div>`;
        showModal(`Purchases — ${userOrders.length} orders`, html);
      } catch (err) {
        console.error(err);
        alert('Failed to load purchases');
      }
    }
  });

  // ===== LOAD FARMERS =====
  async function loadFarmers() {
    farmersContainer.innerHTML = "Loading...";
    const res = await authFetch(`${API}/farmers`);
    const farmers = await res.json();

    farmersContainer.innerHTML = "";
    farmers.forEach(f => {
      const box = document.createElement("div");
      box.className = "border p-4 rounded shadow flex items-start justify-between";

      box.innerHTML = `
        <div>
          <p><strong>${f.name}</strong> (${f.email})</p>
          <p><strong>Mobile:</strong> ${f.mobileNo || 'N/A'}</p>
          <p><strong>Location:</strong> ${f.address || 'N/A'}</p>
          <div class="flex space-x-3 mt-3">
            <button class="view-products-btn px-3 py-1 bg-blue-600 text-white rounded" data-id="${f._id}">
              View Products
            </button>
          </div>
        </div>
      `;

      farmersContainer.appendChild(box);
    });
  }

  // Farmer container click -> view products
  farmersContainer.addEventListener('click', async (e) => {
    const id = e.target.dataset.id;
    if (!id) return;
    if (!e.target.classList.contains('view-products-btn')) return;

    // Attempt several endpoints to find farmer's products (works with different backend shapes)
    const attempts = [
      `${PRODUCTS_API}/farmer/${id}`,       // /api/products/farmer/:id
      `${PRODUCTS_API}/seller/${id}`,       // /api/products/seller/:id
      `${PRODUCTS_API}?seller=${id}`,       // /api/products?seller=id
      `${PRODUCTS_API}/farmerProducts/${id}`, // alternate
      `${PRODUCTS_API}`                     // fetch all and filter
    ];

    let products = [];
    let triedAll = false;

    for (let i = 0; i < attempts.length; i++) {
      const url = attempts[i];
      try {
        const res = await authFetch(url);
        if (!res.ok) {
          // if final attempt is the /api/products (200 expected), continue; else try next
          if (i === attempts.length - 1) {
            // we'll handle below with filtering
          } else {
            continue;
          }
        }
        const body = await res.json();
        // different endpoints return arrays directly or { products: [...] }
        if (Array.isArray(body)) products = body;
        else if (Array.isArray(body.products)) products = body.products;
        else if (Array.isArray(body.data)) products = body.data;
        else {
          // maybe single object with products
          products = [];
        }

        // if this is the last attempt (/api/products) we need to filter by seller/farmer id
        if (url === `${PRODUCTS_API}`) {
          products = products.filter(p => {
            // attempt multiple keys for seller relation
            if (!p) return false;
            const seller = p.seller || p.user || p.owner || p.farmer || p.sellerId;
            if (!seller) return false;
            // seller may be string or object
            const sid = typeof seller === 'string' ? seller : (seller._id || seller.toString());
            if (!sid) return false;
            return sid.toString() === id.toString();
          });
        }

        // if products found break
        if (products && products.length > 0) break;
      } catch (err) {
        // last attempt we'll fallback to fetching all and filtering
        if (i === attempts.length - 1) {
          triedAll = true;
        }
        // continue trying next endpoint
      }
    }

    // If still empty and we didn't already try fetching all products (last attempt), attempt explicit GET /api/products and filter
    if (products.length === 0 && !triedAll) {
      try {
        const resAll = await authFetch(`${PRODUCTS_API}`);
        const bodyAll = await resAll.json();
        const allProducts = Array.isArray(bodyAll) ? bodyAll : (bodyAll.products || []);
        products = allProducts.filter(p => {
          const seller = p.seller || p.user || p.owner || p.farmer || p.sellerId;
          if (!seller) return false;
          const sid = typeof seller === 'string' ? seller : (seller._id || seller.toString());
          return sid && sid.toString() === id.toString();
        });
      } catch (err) {
        console.error('final fallback fetch products error', err);
      }
    }

    // Build modal HTML
    if (!products || products.length === 0) {
      showModal('Products', `<p>No products found for this farmer.</p>`);
      return;
    }

    let html = '<div class="space-y-3">';
    products.forEach(p => {
      html += `
        <div class="border rounded p-3 flex items-center justify-between">
          <div class="flex items-center">
            <img src="${p.image || p.images?.[0] || ''}" class="w-16 h-16 object-cover rounded mr-3" alt="${p.name || ''}">
            <div>
              <div class="font-semibold">${p.name || p.title || 'Untitled'}</div>
              <div class="text-sm text-gray-600">${p.category || p.cat || ''}</div>
              <div class="text-sm text-gray-700">₹${(p.price || p.mrp || 0).toFixed ? (Number(p.price || p.mrp || 0)).toFixed(2) : (p.price || p.mrp || 'N/A')}</div>
            </div>
          </div>
          <div class="text-right">
            <div class="text-sm">Stock: ${p.countInStock != null ? p.countInStock : (p.stock || 'N/A')}</div>
            <div class="text-sm mt-1">${p.description ? (p.description.substring(0,120) + (p.description.length>120? '...' : '')) : ''}</div>
          </div>
        </div>
      `;
    });
    html += '</div>';
    showModal(`Products (${products.length})`, html);
  });

  // ===== LOAD ORDERS =====
  filterSelect.addEventListener("change", loadOrders);

  async function loadOrders() {
    ordersContainer.innerHTML = "Loading...";
    const status = filterSelect.value;
    const url = status ? `${API}/orders?status=${encodeURIComponent(status)}` : `${API}/orders`;

    const res = await authFetch(url);
    const data = await res.json();

    ordersContainer.innerHTML = "";

    (data.orders || []).forEach(o => {
      const box = document.createElement("div");
      box.className = "border p-4 rounded shadow bg-gray-50";

      const itemsHTML = o.orderItems
        .map(i => `<li>${i.name} (x${i.qty}) - ₹${i.price}</li>`)
        .join("");

      const historyHTML = (o.history || [])
        .map(h => `<li><strong>${h.status}</strong> - ${h.note || ''} <span class="text-xs text-gray-500">(${new Date(h.timestamp).toLocaleString()})</span></li>`)
        .join("");

      box.innerHTML = `
        <h3 class="text-xl font-semibold">Order #${o._id}</h3>
        <p><strong>User:</strong> ${o.user?.name} (${o.user?.email})</p>
        <p><strong>Status:</strong> ${o.status}</p>
        <p><strong>Tracking:</strong> ${o.trackingNumber || "None"}</p>

        <h4 class="font-semibold mt-2">Items:</h4>
        <ul class="ml-4 list-disc">${itemsHTML}</ul>

        <h4 class="font-semibold mt-2">Update Status</h4>
        <select class="status-select border p-2 rounded" data-id="${o._id}">
            <option value="Pending">Pending</option>
            <option value="Packed">Packed</option>
            <option value="Shipped">Shipped</option>
            <option value="Out for Delivery">Out for Delivery</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
        </select>

        <input class="tracking-input border p-2 rounded mt-2 w-full" data-id="${o._id}" placeholder="Tracking Number"/>

        <textarea class="note-input border p-2 rounded mt-2 w-full" data-id="${o._id}" placeholder="Note (optional)"></textarea>

        <div class="flex justify-end mt-3">
            <button class="update-order-btn px-4 py-2 bg-green-600 text-white rounded" data-id="${o._id}">
                Update
            </button>
        </div>

        <h4 class="font-semibold mt-3">History</h4>
        <ul class="ml-4 list-disc">${historyHTML}</ul>
      `;
      ordersContainer.appendChild(box);
    });
  }

  // Handle order update
  ordersContainer.addEventListener("click", async (e) => {
    if (!e.target.classList.contains("update-order-btn")) return;

    const id = e.target.dataset.id;
    const status = document.querySelector(`.status-select[data-id="${id}"]`).value;
    const tracking = document.querySelector(`.tracking-input[data-id="${id}"]`).value;
    const note = document.querySelector(`.note-input[data-id="${id}"]`).value;

    await authFetch(`${API}/orders/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status, trackingNumber: tracking, note })
    });

    alert("Order updated!");
    loadOrders();
  });

  // Initial load
  loadUsers();
});
