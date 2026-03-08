import "./App.css";
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Navbar from "./components/ui/Navbar";
import Dashboard from "./pages/Dashboard";
import Top from "./pages/Top";
import { DateRangeProvider } from "./context/DateRangeContext";
import Callback from "./pages/Callback";
import Artist from "./pages/Artist";
import Track from "./pages/Track";
import Album from "./pages/Album";
import { HealthProvider, useHealth } from "./context/HealthContext";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Analytics from "./pages/Analytics";
import Welcome from "./pages/Welcome";
import { AuthProvider, useAuth } from "./context/AuthContext";

const AppContent: React.FC = () => {
  const { statusComponent } = useHealth();
  const { isAuthenticated, isLoading } = useAuth();

  const renderLayout = (content: React.ReactNode) => (
    <div className="max-width-page">
      <div className="container">
        <Navbar />
        {statusComponent && (
          <div className="mb-3">{statusComponent}</div>
        )}
        {!statusComponent && content}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
        <span className="text-custom-muted">Loading...</span>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/callback" element={renderLayout(<Callback />)} />
      <Route
        path="/welcome"
        element={
          isAuthenticated ? <Navigate to="/dashboard" /> : (
            <div className="min-vh-100">
              {statusComponent}
              {!statusComponent && <Welcome />}
            </div>
          )
        }
      />
      <Route
        path="/"
        element={isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/welcome" />}
      />
      <Route
        path="/*"
        element={
          isAuthenticated ? (
            <DateRangeProvider>
              <Routes>
                <Route path="/dashboard" element={renderLayout(<Dashboard />)} />
                <Route path="/top" element={<Navigate to="/top/artists" />} />
                <Route path="/top/:category" element={renderLayout(<Top />)} />
                <Route path="/track/:spotify_id" element={renderLayout(<Track />)} />
                <Route path="/artist/:spotify_id" element={renderLayout(<Artist />)} />
                <Route path="/album/:spotify_id" element={renderLayout(<Album />)} />
                <Route path="/profile" element={renderLayout(<Profile />)} />
                <Route path="/settings" element={renderLayout(<Settings />)} />
                <Route path="/analytics" element={renderLayout(<Analytics />)} />
              </Routes>
            </DateRangeProvider>
          ) : (
            <Navigate to="/welcome" />
          )
        }
      />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <HealthProvider>
          <AppContent />
        </HealthProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
