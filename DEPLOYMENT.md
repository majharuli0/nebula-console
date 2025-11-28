# 🚀 Deployment Guide (cPanel)

This guide explains how to deploy **Nebula Console** to a cPanel hosting environment using GitHub Actions.

## Prerequisites

1.  **cPanel Hosting** that supports **Node.js**.
2.  **GitHub Repository** with your project code.
3.  **FTP Credentials** (Host, Username, Password).

---

## Step 1: Set up Node.js Application in cPanel

1.  Log in to **cPanel**.
2.  Find the **"Setup Node.js App"** icon (under Software).
3.  Click **"Create Application"**.
4.  **Node.js Version:** Select a recent version (e.g., 18.x or 20.x).
5.  **Application Mode:** `Production`.
6.  **Application Root:** Enter the folder name where the backend code will live (e.g., `node_app`).
    *   *Note: This is where the GitHub Action will upload the `server` folder.*
7.  **Application URL:** Select the domain/subdomain for your backend (e.g., `api.yourdomain.com` or `yourdomain.com/api`).
8.  **Application Startup File:** Enter `index.js`.
9.  Click **"Create"**.
10. **Copy the "Virtual Environment Command"** (you might need it later for manual debugging, but our workflow handles the upload).
11. **Important:** Click **"Stop App"** for now.

---

## Step 2: Configure GitHub Secrets

To allow GitHub to upload files to your server securely, you need to add your FTP credentials as "Secrets".

1.  Go to your **GitHub Repository**.
2.  Click **Settings** > **Secrets and variables** > **Actions**.
3.  Click **"New repository secret"**.
4.  Add the following secrets:

    | Name | Value | Description |
    | :--- | :--- | :--- |
    | `FTP_SERVER` | `ftp.yourdomain.com` | Your FTP Hostname (check cPanel). |
    | `FTP_USERNAME` | `your_cpanel_user` | Your FTP Username. |
    | `FTP_PASSWORD` | `your_password` | Your FTP Password. |
    | `VITE_SERVER_URL` | `https://api.yourdomain.com` | The full URL of your Node.js app (from Step 1). |

---

## Step 3: Configure the Workflow File

The deployment file is located at `.github/workflows/deploy.yml`. You might need to adjust the paths depending on your cPanel setup.

1.  Open `.github/workflows/deploy.yml`.
2.  **Frontend Path:**
    *   Look for `server-dir: ./public_html/` in the `deploy-client` job.
    *   If you want the game to be at the root of your domain (e.g., `yourdomain.com`), keep it as `./public_html/`.
    *   If you want it in a subfolder (e.g., `yourdomain.com/game`), change it to `./public_html/game/`.
3.  **Backend Path:**
    *   Look for `server-dir: ./node_app/` in the `deploy-server` job.
    *   Ensure this matches the **Application Root** you set in **Step 1** (e.g., `node_app`).

---

## Step 4: First Deployment

1.  Push your code to the `main` branch on GitHub.
2.  Go to the **Actions** tab in your repository to watch the deployment progress.
3.  Once both `deploy-client` and `deploy-server` jobs are green (Success):

    **Final Server Setup:**
    1.  Go back to **cPanel** > **Setup Node.js App**.
    2.  Click the **Pencil icon** to edit your app.
    3.  Click **"Run NPM Install"**. (This installs the dependencies on the server).
    4.  Click **"Restart"**.

---

## Step 5: Verify

1.  Open your **Frontend URL** (e.g., `yourdomain.com`).
2.  Open the browser console (F12).
3.  Check if it connects to the backend. You should see "Connected" or similar logs, and no connection errors.

## Troubleshooting

*   **404 Errors on Refresh:**
    *   Since this is a React Single Page App (SPA), you need to configure the server to redirect all requests to `index.html`.
    *   In cPanel **File Manager**, go to your `public_html` (or frontend folder).
    *   Create a file named `.htaccess` (if it doesn't exist) and add:
        ```apache
        <IfModule mod_rewrite.c>
          RewriteEngine On
          RewriteBase /
          RewriteRule ^index\.html$ - [L]
          RewriteCond %{REQUEST_FILENAME} !-f
          RewriteCond %{REQUEST_FILENAME} !-d
          RewriteRule . /index.html [L]
        </IfModule>
        ```
*   **Socket Connection Failed:**
    *   Ensure `VITE_SERVER_URL` secret is correct (starts with `https://` and has no trailing slash).
    *   Ensure the Node.js app is running in cPanel.
