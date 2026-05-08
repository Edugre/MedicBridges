import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Search from './pages/Search';
import Clinic from './pages/Clinic';
import ClinicSignup from './pages/ClinicSignup';
import ForClinics from './pages/ForClinics';
import Historias from './pages/Historias';
import MapPage from './pages/Map';
import PatientSignup from './pages/PatientSignup';
import Privacy from './pages/Privacy';
import Problem from './pages/Problem';

import './styles/globals.css';
import './styles/medicbridges-theme.css';
import './styles/medicbridges-components.css';

import Navbar from './layout/Navbar';
import Footer from './layout/Footer';

function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar />
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/clinic/:id" element={<Clinic />} />
            <Route path="/clinic-signup" element={<ClinicSignup />} />
            <Route path="/for-clinics" element={<ForClinics />} />
            <Route path="/historias" element={<Historias />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/patient-signup" element={<PatientSignup />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/problem" element={<Problem />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
