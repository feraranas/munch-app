import React, { useState } from 'react';
import * as Sentry from '@sentry/react';
import Logo from './Logo';

const LandingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'business' | 'developers' | 'teams'>('business');

  const testimonials = [
    {
      quote: "It's like having a cheat code for clearing out your inbox. The accuracy and responsiveness feel like magic.",
      author: "Maria González",
      company: "Restaurant Owner",
    },
    {
      quote: "I started using this app at my restaurant, and then started using it everywhere - it's really slick and fast.",
      author: "Carlos Ruiz",
      company: "Head Chef, La Cocina",
    },
    {
      quote: "This is the best restaurant payment app I've used. No more waiting for the check!",
      author: "Ana Martínez",
      company: "Food Blogger",
    },
  ];

  const useCases = {
    business: [
      "Process payments faster by scanning QR codes instead of manual entry",
      "Keep your service personal with seamless bill splitting",
      "Maintain focus on customer experience by reducing payment friction",
      "Capture orders instantly before they're forgotten",
    ],
    developers: [
      "Integrate with modern payment APIs and webhooks",
      "Build comprehensive admin dashboards with minimal effort",
      "Get through your feature backlog even faster",
      "Real-time order updates via WebSocket connections",
    ],
    teams: [
      "Spend less time on manual payment processing",
      "Guide your staff with clear, actionable interfaces",
      "Reduce cognitive load with intuitive workflows",
      "Track and manage orders on the fly",
    ],
  };

  const integrations = [
    { name: 'Stripe', description: 'Secure payment processing' },
    { name: 'Square', description: 'POS integration' },
    { name: 'PayPal', description: 'Global payments' },
    { name: 'QuickBooks', description: 'Accounting sync' },
    { name: 'Toast', description: 'Restaurant POS' },
    { name: 'Clover', description: 'Payment terminal' },
  ];

  return (
    <div className="min-h-screen bg-lumen">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Logo width={40} height={40} />
              <span className="text-xl font-bold text-neutral-900">Munch</span>
            </div>
            <div className="flex items-center space-x-6">
              <a href="#features" className="text-neutral-700 hover:text-pulse transition-colors duration-normal font-medium">
                Features
              </a>
              <a href="#use-cases" className="text-neutral-700 hover:text-pulse transition-colors duration-normal font-medium">
                Use Cases
              </a>
              <a
                href="/login"
                className="px-6 py-2.5 bg-pulse text-white rounded-lg font-semibold hover:scale-105 hover:shadow-lg transition-all duration-normal"
              >
                Sign In
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 md:py-32 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-bold text-neutral-900 mb-6 leading-tight">
              Split bills in every restaurant
            </h1>
            <p className="text-xl md:text-2xl text-neutral-600 mb-12 leading-relaxed">
              Pay at the speed you think. Scan, split, and settle your bill—instantly. 
              No more waiting for the check or doing mental math.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="/check/demo"
                className="w-full sm:w-auto px-8 py-4 bg-accent-green text-white rounded-xl font-bold text-lg hover:scale-105 hover:shadow-xl transition-all duration-normal shadow-lg"
              >
                Try Demo
              </a>
              <a
                href="/login"
                className="w-full sm:w-auto px-8 py-4 bg-transparent border-2 border-pulse text-pulse rounded-xl font-semibold text-lg hover:bg-pulse-50 transition-all duration-normal"
              >
                Restaurant Sign In
              </a>
            </div>
          </div>
        </div>
        
        <div className="text-center mt-8">
          <h2>🍽️</h2>
          <p>Para ver tu cuenta, escanea el QR de tu mesa.</p>
          
          <div className="mt-6">
            <a
              href="/login"
              className="inline-block px-6 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200"
            >
              Acceso de Personal
            </a>
          </div>
        </div>
      </div>
      <SentryHelloWorldButtons />
    </div>
  );
};

export default Sentry.withProfiler(LandingPage);
