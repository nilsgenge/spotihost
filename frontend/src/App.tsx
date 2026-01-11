import "./App.css";
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Navbar from "./components/blocks/Navbar";
import Dashboard from "./pages/Dashboard";
import Top from "./pages/Top";
import { DateRangeProvider } from "./context/DateRangeContext";
import Callback from "./pages/Callback";
import Artist from "./pages/Artist";
import Track from "./pages/Track";
import Album from "./pages/Album";

const App: React.FC = () => {
  return (
    <Router>
      <div className="max-width-page">
        <div className="container">
          <Navbar />
        </div>
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
          </Routes>
        </DateRangeProvider>
      </div>
    </Router>
  );
};

export default App;
