import React, { Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './index.css'
import HomePage from './components/HomePage'
import CatalogPage from './components/CatalogPage'
import PlansPage from './components/PlansPage'
import CheckoutPage from './components/CheckoutPage'
import PaymentSuccessPage from './components/PaymentSuccessPage'
import DashboardPage from './components/DashboardPage'
import ResourceDetailPage from './components/ResourceDetailPage'
import EventsNewsPage from './components/EventsNewsPage'
import ScrollToTop from './components/ScrollToTop'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { WooCommerceProvider } from './context/WooCommerceContext'
import { EventsNewsProvider } from './context/EventsNewsContext'
import { Toaster } from 'react-hot-toast'
import Cart from './components/Cart'
import MonthlyArticlesPage from './components/MonthlyArticlesPage'
import PrivacyPolicyPage from './components/PrivacyPolicyPage'
import UserPurchasesPage from './components/UserPurchasesPage'
import SignIn from './components/SignIn'
import ApiTestPage from './components/ApiTestPage'
import TermsOfUsePage from './components/TermsOfUsePage'
import SignUpPage from './components/SignUpPage'
import UserSettingsPage from './components/UserSettingsPage'
import ThankYouPage from './components/ThankYouPage'

// Error boundary component to catch errors
class ErrorBoundaryComponent extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error in component:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-center">
          <h2 className="text-red-600 text-lg font-bold mb-2">Something went wrong.</h2>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const App: React.FC = () => {
  return (
    <ErrorBoundaryComponent>
      <AuthProvider>
        <CartProvider>
          <WooCommerceProvider>
            <EventsNewsProvider>
              <Router>
                <ScrollToTop />
                <Toaster 
                  position="top-right"
                  toastOptions={{
                    duration: 3000,
                    style: {
                      background: '#363636',
                      color: '#fff',
                    },
                    success: {
                      iconTheme: {
                        primary: '#2bcd82',
                        secondary: '#fff',
                      },
                    },
                    error: {
                      iconTheme: {
                        primary: '#fb6a69',
                        secondary: '#fff',
                      },
                    },
                  }}
                />
                <Cart />
                <Suspense fallback={<div className="p-4 text-center">Loading...</div>}>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/catalog" element={<CatalogPage />} />
                    <Route path="/plans" element={<PlansPage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/payment-success" element={<PaymentSuccessPage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/purchases" element={<UserPurchasesPage />} />
                    <Route path="/catalog/:resourceId" element={<ResourceDetailPage />} />
                    <Route path="/events-news" element={<EventsNewsPage />} />
                    <Route path="/monthly-articles" element={<MonthlyArticlesPage />} />
                    <Route path="/privacy" element={<PrivacyPolicyPage />} />
                    <Route path="/terms" element={<TermsOfUsePage />} />
                    <Route path="/signin" element={<SignIn />} />
                    <Route path="/signup" element={<SignUpPage />} />
                    <Route path="/settings" element={<UserSettingsPage />} />
                    <Route path="/api-test" element={<ApiTestPage />} />
                    <Route path="/thankyou" element={<ThankYouPage />} />
                  </Routes>
                </Suspense>
              </Router>
            </EventsNewsProvider>
          </WooCommerceProvider>
        </CartProvider>
      </AuthProvider>
    </ErrorBoundaryComponent>
  )
}

export default App
