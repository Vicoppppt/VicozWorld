import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProfileProvider, useProfile } from "./context/ProfileContext";
import { ProfileModal } from "./components/ProfileModal";
import { Home } from "./pages/Home";
import { Cinematheque } from "./pages/Cinematheque";
import { Notes } from "./pages/Notes";
import { Portfolio } from "./pages/Portfolio";
import { Quiz } from "./pages/Quiz";
import { Banque } from "./pages/Banque";
import { Genealogie } from "./pages/Genealogie";
import { Energie } from "./pages/Energie";
import { Actualites } from "./pages/Actualites";
import { Meteo } from "./pages/Meteo";
import { Securite } from "./pages/Securite";

function PrivateRoute({ children }) {
  const { isGuest } = useProfile();
  if (isGuest) {
    return <Navigate to="/cinematheque" replace />;
  }
  return children;
}

function App() {
  return (
    <ProfileProvider>
      <Router>
        <ProfileModal />
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/cinematheque" element={<Cinematheque />} />
            <Route path="/meteo" element={<Meteo />} />
            <Route path="/quiz" element={<Quiz />} />

            {/* Routes strictement privées (Inaccessibles aux Invités) */}
            <Route path="/banque" element={<PrivateRoute><Banque /></PrivateRoute>} />
            <Route path="/energie" element={<PrivateRoute><Energie /></PrivateRoute>} />
            <Route path="/notes" element={<PrivateRoute><Notes /></PrivateRoute>} />
            <Route path="/genealogie" element={<PrivateRoute><Genealogie /></PrivateRoute>} />
            <Route path="/securite" element={<PrivateRoute><Securite /></PrivateRoute>} />
            <Route path="/actualites" element={<PrivateRoute><Actualites /></PrivateRoute>} />
            <Route path="/portfolio" element={<PrivateRoute><Portfolio /></PrivateRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </Router>
    </ProfileProvider>
  );
}

export default App;
