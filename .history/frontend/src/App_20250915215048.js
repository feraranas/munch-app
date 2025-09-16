import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import CheckView from './components/CheckView';
import QRGenerator from './components/QRGenerator';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/check/:orderId" element={<CheckView />} />
          <Route path="/admin/qr" element={<QRGenerator />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
