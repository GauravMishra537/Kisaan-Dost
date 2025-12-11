# Kisaan-Dost
🚜 Kisaan – Farmer Management & Admin Monitoring System

Kisaan is a full-stack agricultural management platform designed to streamline the communication and workflow between Admin, Block Officers, and Farmers.
The system provides tools for farmer registration, order tracking, block-level monitoring, and a secure admin dashboard with granular access controls.

✨ Features
👨‍💼 Admin Panel

Secure Admin Login (Username + Password)

Manage:

Block Officers

Farmers

Orders

Reports / Analytics

Monitor all activity across all blocks

CRUD operations for all entities

Role-based access for future updates

🌾 Farmer Module

Farmer profile management

Submit orders / requests

Track order status

Communication with assigned block officer

🧑‍💼 Block Officer Module

View & manage farmers under assigned block

Approve / reject farmer requests

Update order progress

Submit reports to admin

🗄️ Database Ready

Fully structured MongoDB models for:

Admin

Block

Farmer

Orders

Updates to models ensure no previously stored data is lost

🏗️ Tech Stack
Frontend

React.js

Tailwind CSS

Axios

React Router

Backend

Node.js

Express.js

MongoDB + Mongoose

JWT authentication

Bcrypt password hashing

📁 Project Structure
Kisaan/
│
├── backend/
│   ├── controllers/
│   ├── models/
│   │   ├── Admin.js
│   │   ├── Block.js
│   │   ├── Farmer.js
│   │   └── Order.js   ← updated model preserving old data
│   ├── routes/
│   ├── middleware/
│   └── server.js
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   │   ├── AdminLogin.jsx
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── FarmerPanel.jsx
│   │   │   └── BlockDashboard.jsx
│   │   ├── context/
│   │   └── utils/
│   └── package.json
│
└── README.md

🚀 Getting Started
1️⃣ Clone the Repository
git clone https://github.com/<your-username>/Kisaan.git
cd Kisaan

🔧 Backend Setup
Install dependencies:
cd backend
npm install

Create .env file:
MONGO_URI=your_mongodb_url
JWT_SECRET=your_secret_key
PORT=5000

Start backend server:
npm start

🖥️ Frontend Setup
cd frontend
npm install
npm run dev


Frontend runs at:

http://localhost:5173


Backend runs at:

http://localhost:5000

🔐 Admin Login Credentials

Default initial admin user is created manually (or via seeding script):

username: admin
password: <your-password>


You can add more admins directly from the Admin Dashboard.

🧪 API Testing (Optional)

You can test all backend routes using:

Postman

Thunder Client

Swagger (if enabled in future updates)

📌 Future Enhancements

Multi-level user roles & permissions

Geo-mapping of farmers & blocks

SMS/WhatsApp notifications

Automated reports

Weather & crop advisory system

Progressive Web App (PWA) support
