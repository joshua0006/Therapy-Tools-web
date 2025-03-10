import React, { Suspense, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import './index.css'
import HomePage from './components/HomePage'
import CatalogPage from './components/CatalogPage'
import CheckoutPage from './components/CheckoutPage'
import ResourceDetailPage from './components/ResourceDetailPage'
import SignIn from './components/SignIn'
import SignUpPage from './components/SignUpPage'
import { ErrorBoundary, FallbackProps } from 'react-error-boundary'
import EventsNewsPage from './components/EventsNewsPage'
import UserSettingsPage from './components/UserSettingsPage'
import PlansPage from './components/PlansPage'
import PaymentSuccessPage from './components/PaymentSuccessPage'
import { AuthProvider } from './context/AuthContext'
import { WooCommerceProvider } from './context/WooCommerceContext'
import { CartProvider } from './context/CartContext'
import { EventsNewsProvider } from './context/EventsNewsContext'
import { CategoriesProvider } from './context/CategoriesContext'
import { Toaster } from 'react-hot-toast'
import PrivacyPolicyPage from './components/PrivacyPolicyPage'
import UserPurchasesPage from './components/UserPurchasesPage'
import ThankYouPage from './components/ThankYouPage'
import BookmarksPage from './components/BookmarksPage'
import TermsOfUsePage from './components/TermsOfUsePage'
import ApiTestPage from './components/ApiTestPage'

// Error boundary component to catch errors
const ErrorFallback: React.FC<FallbackProps> = ({ error, resetErrorBoundary }) => {
  return (
    <div className="text-red-500 p-4">
      <h2 className="text-xl font-bold">Something went wrong:</h2>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary} className="mt-4 bg-blue-500 text-white px-4 py-2 rounded">
        Try again
      </button>
    </div>
  )
}

// Scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  
  return null;
}

// Create an AppContent component that will be inside the Router
const AppContent: React.FC = () => {
  return (
    <>
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
            duration: 3000,
            style: {
              background: '#2bcd82',
              color: '#fff',
            },
          },
          error: {
            duration: 4000,
            style: {
              background: '#E53E3E',
              color: '#fff',
            },
          }
        }}
      />
      <Suspense fallback={<div className="p-4 text-center">Loading...</div>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/plans" element={<PlansPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/payment-success" element={<PaymentSuccessPage />} />
          <Route path="/purchases" element={<UserPurchasesPage />} />
          <Route path="/catalog/:resourceId" element={<ResourceDetailPage />} />
          <Route path="/events-news" element={<EventsNewsPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms-of-use" element={<TermsOfUsePage />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/settings" element={<UserSettingsPage />} />
          <Route path="/thankyou" element={<ThankYouPage />} />
          <Route path="/bookmarks" element={<BookmarksPage />} />
          <Route path="/api-test" element={<ApiTestPage />} />
        </Routes>
      </Suspense>
    </>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <AuthProvider>
        <WooCommerceProvider>
          <CartProvider>
            <EventsNewsProvider>
              <CategoriesProvider>
                <Router>
                  <AppContent />
                </Router>
              </CategoriesProvider>
            </EventsNewsProvider>
          </CartProvider>
        </WooCommerceProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
