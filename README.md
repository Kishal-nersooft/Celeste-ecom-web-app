# 🛒 Celeste Ecommerce Platform

A modern, full-featured ecommerce platform built with Next.js 14, featuring multi-vendor support, delivery/pickup modes, dynamic pricing, and seamless payment integration.

![Next.js](https://img.shields.io/badge/Next.js-14.2.5-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Firebase](https://img.shields.io/badge/Firebase-10.12.4-orange)
![Stripe](https://img.shields.io/badge/Stripe-17.4.0-purple)

## ✨ Features

- 🏪 **Multi-Vendor Stores** - Browse products from multiple vendors
- 🚚 **Delivery & Pickup Modes** - Choose between home delivery or store pickup
- 💳 **Stripe Payments** - Secure payment processing with Stripe integration
- 🔐 **Firebase Auth** - Phone and email authentication
- 📍 **Location-Based Service** - Google Maps integration for address selection
- 🛒 **Smart Cart** - Zustand-powered cart with real-time updates
- 🎨 **Modern UI** - Built with Radix UI, Tailwind CSS, and Framer Motion
- 💰 **Dynamic Pricing** - Automatic pricing calculation with discounts
- 📦 **Inventory Management** - Real-time stock status tracking
- 🔔 **Toast Notifications** - User-friendly feedback with react-hot-toast
- 📱 **Responsive Design** - Mobile-first approach

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn or pnpm
- Firebase project setup
- Stripe account

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd Celeste-Web
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

   # Stripe Configuration
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_publishable_key
   STRIPE_SECRET_KEY=your_secret_key
   STRIPE_WEBHOOK_SECRET=your_webhook_secret

   # Google Maps API
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key

   # API URLs
   NEXT_PUBLIC_API_URL=your_api_url
   NEXT_PUBLIC_SANITY_PROJECT_ID=your_sanity_project_id
   NEXT_PUBLIC_SANITY_DATASET=your_sanity_dataset
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```
   
   This will automatically find an available port (starting from 3000) and start the server.

   You can also use:
   ```bash
   npm run dev:port    # Start on port 3000
   npm run dev:auto   # Auto-detect available port
   ```

5. **Open your browser**
   
   Visit [http://localhost:3000](http://localhost:3000) (or the port shown in terminal)

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with auto port detection |
| `npm run dev:port` | Start dev server on port 3000 |
| `npm run dev:auto` | Start dev server with auto port detection |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## 🏗️ Project Structure

```
Celeste-Web/
├── app/                    # Next.js 14 App Router
│   ├── (client)/          # Client-facing pages
│   │   ├── api/           # API routes
│   │   ├── cart/          # Shopping cart page
│   │   ├── checkout/      # Checkout process
│   │   ├── product/       # Product pages
│   │   ├── categories/    # Category pages
│   │   └── stores/        # Store pages
│   └── api/               # Backend API routes
├── components/            # React components
│   ├── ui/               # UI components (shadcn/ui)
│   ├── CartItems.tsx     # Cart management
│   ├── Header.tsx        # Navigation header
│   └── ...
├── contexts/             # React contexts
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions
├── store.ts              # Zustand state management
├── actions/              # Server actions
└── public/               # Static assets
```

## 🛠️ Tech Stack

### Core
- **Next.js 14.2.5** - React framework with App Router
- **TypeScript 5** - Type safety
- **React 18.3** - UI library
- **Tailwind CSS 3.4** - Styling

### Backend & Services
- **Firebase 10.12** - Authentication & real-time database
- **Firebase Admin 12.3** - Server-side Firebase
- **Stripe 17.4** - Payment processing
- **Sanity 4.10** - Headless CMS

### UI/UX
- **Radix UI** - Accessible component primitives
- **Lucide React** - Icon library
- **Framer Motion 11** - Animations
- **React Icons** - Icon sets
- **React Hot Toast** - Toast notifications
- **Zustand 5** - State management

### Additional
- **Sharp** - Image optimization
- **Google Maps API** - Location services
- **Embla Carousel** - Carousel component
- **Styled Components** - CSS-in-JS

## 📦 Key Features Explained

### Shopping Experience
- Browse products by category with real-time stock information
- Add items to cart with quantity management
- View cart preview without leaving the page
- Support for both delivery and pickup orders
- Location-based pricing and availability

### Authentication
- Phone number authentication
- Email/password authentication
- Protected routes
- User profile management
- Address management

### Payments
- Secure checkout with Stripe
- Multiple payment methods
- Order confirmation
- Webhook handling for payments
- Order history tracking

## 🌐 Deployment

### Deploy to Vercel

The easiest way to deploy is using [Vercel](https://vercel.com):

1. Push your code to GitHub
2. Import project on Vercel
3. Add environment variables
4. Deploy!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=YOUR_REPO_URL)

### Manual Deployment

```bash
npm run build
npm run start
```

## 📄 Environment Variables

Make sure to configure all required environment variables before deployment. See the `.env.example` file for reference.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is private and proprietary.

## 📞 Support

For support, email support@celeste.com or create an issue in the repository.

---
