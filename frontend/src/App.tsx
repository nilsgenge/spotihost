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

const AppContent: React.FC = () => {
  const { statusComponent } = useHealth();

  const renderLayout = (content: React.ReactNode) => (
    <div className="max-width-page">
      <div className="container">
        <Navbar />
        {content}
      </div>
    </div>
  );

  const contentToRender = statusComponent ? (
    statusComponent
  ) : (
    <DateRangeProvider>
      <Routes>
        <Route path="/callback" element={<Callback />} />
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/top" element={<Navigate to="/top/artists" />} />
        <Route path="/top/:category" element={<Top />} />
        <Route path="/track/:spotify_id" element={<Track />} />
        <Route path="/artist/:spotify_id" element={<Artist />} />
        <Route path="/album/:spotify_id" element={<Album />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
    </DateRangeProvider>
  );

  return renderLayout(contentToRender);
};

const App: React.FC = () => {
  return (
    <Router>
      <HealthProvider>
        <AppContent />
      </HealthProvider>
    </Router>
  );
};

export default App;
