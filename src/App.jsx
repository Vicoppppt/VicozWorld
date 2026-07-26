import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { Cinematheque } from "./pages/Cinematheque";

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cinematheque" element={<Cinematheque />} />
          {/* Les futures pages (Portfolio, Notes, etc.) viendront ici */}
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
