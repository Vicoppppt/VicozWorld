import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { Cinematheque } from "./pages/Cinematheque";
import { Notes } from "./pages/Notes";
import { Portfolio } from "./pages/Portfolio";

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cinematheque" element={<Cinematheque />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/portfolio" element={<Portfolio />} />
          {/* Les futures pages viendront ici */}
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
