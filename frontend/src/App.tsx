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
            <Route path="/top" element={<Top />} />
          </Routes>
        </DateRangeProvider>
      </div>
    </Router>
  );
};

export default App;
