# Kisaan-Dost
🌾 Kisaan Dost – A Full-Stack Agricultural E-Commerce Platform
Connecting Farmers directly with Buyers | Fair Prices | Transparency | Digital Market for Rural India

Kisaan Dost is a full-stack agricultural marketplace built with Node.js + Express + MongoDB + Vanilla JS + TailwindCSS.

The platform enables:

👨‍🌾 Farmers to sell their crops

🛒 Buyers to purchase fresh produce

🧾 Order Management

🚚 Delivery Tracking

🛠 Admin Panel for monitoring the entire platform

This project supports complete authentication, farmer product management, buyer cart system, order processing, payment selection, profile management, and a full admin monitoring dashboard.

📌 Table of Contents

⚙️ Tech Stack

✨ Features

📂 Folder Structure

🚀 Installation & Setup

🔐 Environment Variables

🛠 API Endpoints Overview

🧑‍💼 Admin Panel Features

🚚 Delivery Tracking Workflow

🧪 Testing

📌 Future Improvements

⚙️ Tech Stack
Frontend

HTML5, CSS3 (TailwindCSS)

Vanilla JavaScript (ES6 Modules)

LocalStorage-based session handling

Fully responsive UI

Backend

Node.js + Express.js

MongoDB + Mongoose

JWT Authentication

Middleware-based security

MVC structured routes

Other Tools

MongoDB Compass

Postman / Thunder Client

Git & GitHub

✨ Core Features
🔐 Authentication & Security

Login / Signup (JWT based)

Separate roles:

Buyer

Farmer

Admin

Password hashing using bcrypt

Security Question + Answer for password recovery

Blocked users cannot login

👨‍🌾 Farmer Features

Farmer-only dashboard

Add new products

Edit product

Delete product

Manage stock (countInStock)

Product listing with categories

Manage bank details for payout

🛍️ Buyer Features

Add items to cart

Remove items from cart

Cart quantity validation vs stock

Profile management

Update password, address, mobile number

View transaction history (orders)

Checkout with:

Cash on Delivery

UPI Payment (reference ID entry)

📦 Product Features

Category filters: Fruit, Vegetable, Grain, Herb, Other

Stock tracking

Ratings & review structure

Location tagging

Real products grid with:

price

location

ratings

out-of-stock blocking

🧾 Order Features

Order creation

Order details stored:

shipping address

price calculation

payment method

list of each product in order

Order history for buyers

Order total, tax, shipping management

Auto stock decrement on purchase

🚚 Delivery Tracking (Full Workflow)

Each order contains:

status — Pending → Packed → Shipped → Out for Delivery → Delivered → Cancelled

trackingNumber

estimatedDelivery

history[] — Full timeline with timestamps & notes

Order History Example
[
  { status: "Pending", note: "Order created", timestamp: ... },
  { status: "Packed", note: "Farmer packed items", timestamp: ... },
  { status: "Shipped", note: "Left warehouse", timestamp: ... },
]

Shown to:

Buyer in Profile → Orders

Admin in Admin Portal → Orders

🧑‍💼 Admin Panel (Full System)

A fully built separate frontend located at admin.html + admin.js.

Admin Features
👥 User Management

View all users

Block / Unblock users

Promote to Admin

Delete users

👨‍🌾 Farmer Management

View all farmers

View farmer details (address, phone, etc.)

🧾 Order Management

View all orders

Filter orders by status

Update order status

Add tracking number

Add delivery notes

See complete order timeline

🔐 Admin Login

Separate admin-login.html page

Allows only admin accounts to enter

Uses JWT + server-side role validation

📂 Folder Structure
kisaan-dost/
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   ├── Product.js
│   │   └── Order.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── product.js
│   │   ├── order.js
│   │   ├── user.js
│   │   ├── cart.js
│   │   └── admin.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── ensureAdmin.js
│   ├── server.js
│   └── db.js
│
├── frontend/
│   ├── index.html
│   ├── products.html
│   ├── farmer-dashboard.html
│   ├── profile.html
│   ├── payment.html
│   ├── admin.html
│   ├── admin-login.html
│   ├── main.js
│   ├── products-page.js
│   ├── farmer-dashboard.js
│   ├── profile.js
│   ├── payment.js
│   ├── admin.js
│   └── style.css
│
├── package.json
├── .env
└── README.md

🚀 Installation & Setup
1️⃣ Clone the project
git clone https://github.com/YOUR_USERNAME/kisaan-dost.git
cd kisaan-dost

2️⃣ Install backend dependencies
cd backend
npm install

3️⃣ Create .env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/kisaandost
JWT_SECRET=your_secret_key_here

4️⃣ Start backend
npm start

5️⃣ Open frontend

Just open frontend/index.html in the browser (or serve via Live Server).

🔐 Environment Variables
Variable	Description
PORT	Backend port
MONGO_URI	MongoDB Connection string
JWT_SECRET	Secret to sign JWT tokens
🛠 API Overview (Short Version)
Authentication

POST /api/auth/login
POST /api/auth/register

Products

GET /api/products
POST /api/products (farmer)
PUT /api/products/:id
DELETE /api/products/:id

Cart

GET /api/cart
POST /api/cart
DELETE /api/cart/:id

Orders

POST /api/orders
GET /api/orders/myorders
GET /api/orders/:id/status
PUT /api/orders/:id/status (admin/farmer)

Admin

GET /api/admin/users
PUT /api/admin/users/:id/block
PUT /api/admin/users/:id/unblock
PUT /api/admin/users/:id/promote
GET /api/admin/farmers
GET /api/admin/orders
PUT /api/admin/orders/:id/status

🧪 Testing

Use Postman / Thunder Client to test:

Authentication

Cart operations

Order placement

Admin role actions

Delivery tracking update

📌 Future Improvements

OTP / SMS Login

Real payment gateway integration (Razorpay / Stripe)

Farmer earnings dashboard (analytics)

Image upload to Cloudinary

Live tracking with Maps API

Push notifications
