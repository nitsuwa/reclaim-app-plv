import { AppProvider, useApp } from "./context/AppContext";
import { LandingPage } from "./components/LandingPage";
import { LoginPage } from "./components/LoginPage";
import { RegisterPage } from "./components/RegisterPage";
import { ForgotPasswordPage } from "./components/ForgotPasswordPage";
import { ResetPasswordPage } from "./components/ResetPasswordPage";
import { EmailVerifiedPage } from "./components/EmailVerifiedPage";
import { LostAndFoundBoard } from "./components/LostAndFoundBoard";
import { ReportItemForm } from "./components/ReportItemForm";
import { ClaimItemForm } from "./components/ClaimItemForm";
import { AdminDashboard } from "./components/AdminDashboard";
import { ProfilePage } from "./components/ProfilePage";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { LoadingScreen } from "./components/LoadingScreen";
import { Toaster } from "./components/ui/sonner";

function AppContent() {
  const { currentPage, currentUser, loading } = useApp();

  // Show loading screen while checking auth state
  if (loading) {
    return <LoadingScreen />;
  }

  const renderPage = () => {
    // ✅ SPECIAL FLOWS - ALWAYS SHOW THESE REGARDLESS OF AUTH STATE
    if (currentPage === "reset-password") {
      return <ResetPasswordPage />;
    }
    if (currentPage === "email-verified") {
      return <EmailVerifiedPage />;
    }

    // Public pages (no auth required)
    if (!currentUser) {
      switch (currentPage) {
        case "login":
          return <LoginPage />;
        case "register":
          return <RegisterPage />;
        case "forgot-password":
          return <ForgotPasswordPage />;
        default:
          return <LandingPage />;
      }
    }

    // ✅ AUTHENTICATED USER PAGES
    switch (currentPage) {
      case "admin":
        return currentUser.role === "admin" ? <AdminDashboard /> : <LostAndFoundBoard />;
      case "board":
        return <LostAndFoundBoard />;
      case "report":
        return <ReportItemForm />;
      case "claim":
        return <ClaimItemForm />;
      case "profile":
        return <ProfilePage />;
      default:
        // Default page based on role
        return currentUser.role === "admin" ? <AdminDashboard /> : <LostAndFoundBoard />;
    }
  };

  // ✅ HIDE HEADER/FOOTER ON SPECIAL PAGES
  const isSpecialPage = ['reset-password', 'email-verified', 'landing', 'login', 'register', 'forgot-password'].includes(currentPage);

  return (
    <div className="flex flex-col min-h-screen">
      {currentUser && !isSpecialPage && <Header />}
      <main className="flex-1">{renderPage()}</main>
      {currentUser && !isSpecialPage && <Footer />}
      <Toaster position="top-right" />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}