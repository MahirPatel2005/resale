# Deployment Guide: Render & MongoDB Atlas

This project is a unified full-stack Node.js Express API + React Vite application. The backend serves the compiled static React frontend automatically when deployed. This allows you to host the entire website on **a single Web Service**!

---

## Step 1: Set up MongoDB Atlas (Cloud Database)

Since your local database (`mongodb://localhost`) is only on your computer, you need a free hosted database in the cloud.

1. **Create an account**: Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) and sign up for a free account.
2. **Create a Free Cluster**: Choose the **M0 (Free)** shared cluster tier, select a region closest to you, and click **Create**.
3. **Database Access**: 
   * Create a database user (e.g., username `admin_user` and a strong password). Write this password down!
4. **Network Access**: 
   * Add an IP address rule. Choose **Allow Access from Anywhere** (`0.0.0.0/0`) so Render can connect to your database.
5. **Get Connection String**:
   * Go to your Database Cluster Dashboard, click **Connect** -> **Drivers**.
   * Copy the connection string. It will look like this:
     ```text
     mongodb+srv://admin_user:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
     ```
   * Replace `<password>` with the password you created in step 3. (This will be your `MONGODB_URI`).

---

## Step 2: Deploy on Render

Render is a popular and free cloud platform that fits this full-stack application perfectly.

1. **Create a Render Account**: Go to [Render](https://render.com) and sign up (link your GitHub account).
2. **New Web Service**: Click **New +** -> **Web Service**.
3. **Connect Repository**: Select your repository `MahirPatel2005/resale`.
4. **Configure Settings**:
   * **Name**: `resale-properties-portal` (or any name you want)
   * **Region**: Select a region close to your target audience.
   * **Branch**: `main`
   * **Runtime**: `Node`
   * **Build Command**: `npm run build` (This runs `vite build` to compile the React frontend assets)
   * **Start Command**: `npm start` (This runs `node src/server.js` to start the backend)
   * **Instance Type**: Select **Free** tier.

5. **Configure Environment Variables**:
   Under the **Environment** tab, click **Add Environment Variable** and enter the following keys and values:

   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `MONGODB_URI` | `mongodb+srv://admin_user:YOUR_DB_PASSWORD@...` | Your MongoDB Atlas connection string |
   | `CLOUDINARY_CLOUD_NAME` | `zb8qnprt` | Cloudinary Cloud Name |
   | `CLOUDINARY_API_KEY` | `272173549986872` | Cloudinary API Key |
   | `CLOUDINARY_API_SECRET` | `6KdLoJDotIMHzl0X7qdRP1_cOG0` | Cloudinary API Secret |
   | `ADMIN_USERNAME` | `admin` | Admin dashboard login username |
   | `ADMIN_PASSWORD` | `your_chosen_admin_password` | Admin dashboard login password |
   | `JWT_SECRET` | `a_long_random_secure_secret_string` | Secure key to sign JWT admin tokens |
   | `PORT` | `10000` | Render default port |

6. **Deploy**: Click **Deploy Web Service**.

---

## Step 3: Verify the Website

1. Render will fetch your code, install dependencies, compile the React build, and boot the server.
2. Once the logs show `Backend API Server running at http://localhost:10000` and `Connected to MongoDB database ✓`, click the public URL provided by Render (e.g. `https://resale-properties-portal.onrender.com`).
3. You can browse the public site immediately.
4. Access the admin dashboard at `https://your-app.onrender.com/admin` to log in, add resale properties, record transaction logs, and upload images to Cloudinary!
