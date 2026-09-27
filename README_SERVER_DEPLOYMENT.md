# ROASTUP Customer Ordering App - Self-Hosted Server Deployment Guide

This guide explains how to host both the **ROASTUP Customer App** and your **ROASTUP POS App** together on your own Linux server / VPS (such as Ubuntu, Debian, or Docker).

---

## 1. Quick Architecture Overview

```
[ Customer Phone / Browser ]
             │
             ▼
    Customer App (Port 3000)
    (Node.js + Express + React)
             │
             │ (Automatic Server-to-Server Sync)
             ▼
       POS App (Port 3001 or https://roastup-pos.olivertalbot09.co.uk)
    (Kitchen Screen / Cashier POS Queue)
```

- When a customer taps **Place Order**, the Customer App server automatically dispatches the order to `POS_API_URL/api/orders`.
- The POS kitchen display and order queue receive the order instantly without any customer-side linking screens.
- When kitchen staff click **BUMP** on the POS screen, the Customer App's real-time engine detects it and pushes an instant notification and chime to the customer.

---

## 2. Running on Your Server with PM2 (Recommended)

### Step 1: Install Node.js & PM2
```bash
# Ubuntu / Debian
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
```

### Step 2: Set up the Customer App
```bash
cd /var/www/roastup-customer-app
npm install
npm run build

# Start the customer app on port 3000:
# (Point POS_API_URL to your POS instance or keep the live domain)
PORT=3000 POS_API_URL="https://roastup-pos.olivertalbot09.co.uk" pm2 start npm --name "roastup-customer" -- start
```

### Step 3: Set up the POS App (if on the same server)
```bash
cd /var/www/roastup-pos-app
npm install
npm run build

# Start POS on port 3001
PORT=3001 pm2 start npm --name "roastup-pos" -- start

# If running on the same server, update POS_API_URL for the customer app:
pm2 restart roastup-customer --update-env --env POS_API_URL="http://127.0.0.1:3001"
```

Save your PM2 processes to restart on server reboot:
```bash
pm2 save
pm2 startup
```

---

## 3. Nginx Reverse Proxy Configuration

To serve both apps under your domain (e.g. `order.roastup.co.uk` and `pos.roastup.co.uk`):

```nginx
# Customer App: order.roastup.co.uk
server {
    server_name order.roastup.co.uk;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # Support Server-Sent Events (SSE) for real-time live notifications:
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_read_timeout 86400s;
    }
}

# POS App: pos.roastup.co.uk
server {
    server_name pos.roastup.co.uk;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable SSL certificates with Let's Encrypt:
```bash
sudo certbot --nginx -d order.roastup.co.uk -d pos.roastup.co.uk
```

---

## 4. Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port for the customer app HTTP server |
| `POS_API_URL` | `https://roastup-pos.olivertalbot09.co.uk` | URL of the POS backend API to mirror orders into (use `http://127.0.0.1:3001` when both apps run on the same server) |

---

## 5. POS Master Control & Customer Security

The customer-facing application is 100% free of developer tools, sync panels, and linking options:

1. **All Customization Managed via POS**:
   - Menu category ordering, digital signage ticker text, announcements, and theme defaults are configured in your POS application.
   - The customer app server automatically queries `/api/customization` from your POS and updates the customer storefront.
2. **Invisible Server-to-Server Linking**:
   - The connection to the POS exists strictly at the Node.js server level using the `POS_API_URL` environment variable.
   - Customers browsing or ordering from their phones cannot inspect or alter POS URLs, trigger kitchen bumps, or access administrative endpoints.
3. **Clean Customer Experience**:
   - Customers only see:
     - Menu browsing and loaded spud customisation
     - Cart & one-tap checkout
     - Spud Points loyalty rewards
     - Live order status tracker with collection instructions
     - Simple preferences (Dark/Light mode, Sound FX, Notifications, Allergen guide)

