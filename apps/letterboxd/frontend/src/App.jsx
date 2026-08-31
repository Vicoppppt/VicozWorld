import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
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

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/actualites" element={<Actualites />} />
          <Route path="/meteo" element={<Meteo />} />
          <Route path="/cinematheque" element={<Cinematheque />} />
          <Route path="/energie" element={<Energie />} />
          <Route path="/banque" element={<Banque />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/genealogie" element={<Genealogie />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="*" element={<Navigate to="/" replace />} />
          {/* Les futures pages viendront ici */}
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
