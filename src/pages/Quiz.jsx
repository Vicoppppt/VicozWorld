import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, Timer, Trophy, ArrowRight, RotateCcw, Clapperboard, Users, Sparkles, Check, X } from 'lucide-react';
import { db } from '../api/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

// Helper pour mélanger un tableau
const shuffleArray = (array) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

// Helper pour piocher 2 mauvaises réponses uniques (différentes de la bonne)
const getWrongAnswers = (pool, correctAnswer, count = 2) => {
  const filtered = pool.filter(item => item !== correctAnswer);
  const shuffled = shuffleArray(filtered);
  return shuffled.slice(0, count);
};

export function Quiz() {
  const [medias, setMedias] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // States du jeu
  const [gameState, setGameState] = useState('menu'); // 'menu', 'playing', 'result'
  const [mode, setMode] = useState(null); // 'director', 'actor', 'all'
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);

  // Récupérer les médias terminés
  useEffect(() => {
    const fetchMedias = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "medias"));
        const data = querySnapshot.docs.map(doc => doc.data());
        // On ne garde que les terminés et ceux qui ont des données utiles
        const finishedMedias = data.filter(m => m.status === "Terminé" && (m.type === "Film" || m.type === "Série"));
        setMedias(finishedMedias);
      } catch (error) {
        console.error("Erreur chargement médias :", error);
        toast.error("Impossible de charger vos données pour le quiz.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchMedias();
  }, []);

  // Timer
  useEffect(() => {
    if (gameState !== 'playing' || isAnswerRevealed) return;
    
    if (timeLeft === 0) {
      handleTimeOut();
      return;
    }

    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, gameState, isAnswerRevealed]);

  const handleTimeOut = () => {
    setIsAnswerRevealed(true);
    setTimeout(nextQuestion, 2000);
  };

  const handleAnswer = (answer) => {
    if (isAnswerRevealed) return;
    setSelectedAnswer(answer);
    setIsAnswerRevealed(true);

    if (answer === questions[currentIndex].correctAnswer) {
      setScore(prev => prev + 1);
    }

    setTimeout(nextQuestion, 2000);
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setTimeLeft(10);
      setSelectedAnswer(null);
      setIsAnswerRevealed(false);
    } else {
      setGameState('result');
    }
  };

  const generateQuestions = (selectedMode) => {
    if (medias.length < 5) {
      toast.error("Vous n'avez pas assez d'œuvres terminées pour jouer.");
      return;
    }

    // Extraction des pools de données
    const allTitles = medias.map(m => m.title);
    const validDirectorsMedia = medias.filter(m => m.director);
    const allDirectors = [...new Set(validDirectorsMedia.map(m => m.director))];
    
    const allActorsWithMedia = [];
    medias.forEach(m => {
      if (m.cast && m.cast.length > 0) {
        m.cast.slice(0, 3).forEach(a => {
          if (a.name) {
            allActorsWithMedia.push({ actor: a.name, character: a.character, mediaTitle: m.title });
          }
        });
      }
    });
    const allActors = [...new Set(allActorsWithMedia.map(a => a.actor))];

    if (allDirectors.length < 3 || allActors.length < 3) {
      toast.error("Pas assez de données variées (réalisateurs/acteurs) pour générer un quiz.");
      return;
    }

    const generated = [];
    for (let i = 0; i < 10; i++) {
      // Déterminer le type de question pour ce tour
      let qType = selectedMode;
      if (selectedMode === 'all') {
        qType = Math.random() > 0.5 ? 'director' : 'actor';
      }

      let questionItem = {};
      if (qType === 'director') {
        const subType = Math.random() > 0.5 ? 'mediaToDirector' : 'directorToMedia';
        const randomMedia = validDirectorsMedia[Math.floor(Math.random() * validDirectorsMedia.length)];
        
        if (subType === 'mediaToDirector') {
          const wrongs = getWrongAnswers(allDirectors, randomMedia.director);
          questionItem = {
            text: `Qui a réalisé "${randomMedia.title}" ?`,
            correctAnswer: randomMedia.director,
            choices: shuffleArray([randomMedia.director, ...wrongs]),
            context: randomMedia.type
          };
        } else {
          const wrongs = getWrongAnswers(allTitles, randomMedia.title);
          questionItem = {
            text: `Quelle œuvre a été réalisée par ${randomMedia.director} ?`,
            correctAnswer: randomMedia.title,
            choices: shuffleArray([randomMedia.title, ...wrongs]),
            context: randomMedia.type
          };
        }
      } else {
        // actor
        const subType = Math.random() > 0.5 ? 'actorToMedia' : 'characterToActor';
        const randomItem = allActorsWithMedia[Math.floor(Math.random() * allActorsWithMedia.length)];
        
        if (subType === 'actorToMedia') {
          const wrongs = getWrongAnswers(allTitles, randomItem.mediaTitle);
          questionItem = {
            text: `Dans quelle œuvre a joué ${randomItem.actor} ?`,
            correctAnswer: randomItem.mediaTitle,
            choices: shuffleArray([randomItem.mediaTitle, ...wrongs]),
            context: "Acteur"
          };
        } else {
          const characterText = randomItem.character ? `le rôle de "${randomItem.character}"` : `un rôle`;
          const wrongs = getWrongAnswers(allActors, randomItem.actor);
          questionItem = {
            text: `Qui a joué ${characterText} dans "${randomItem.mediaTitle}" ?`,
            correctAnswer: randomItem.actor,
            choices: shuffleArray([randomItem.actor, ...wrongs]),
            context: "Personnage"
          };
        }
      }
      generated.push(questionItem);
    }

    setQuestions(generated);
    setMode(selectedMode);
    setCurrentIndex(0);
    setScore(0);
    setTimeLeft(10);
    setSelectedAnswer(null);
    setIsAnswerRevealed(false);
    setGameState('playing');
  };

  const resetGame = () => {
    setGameState('menu');
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px]" />
        <div className="animate-pulse text-indigo-400 font-medium text-lg">Chargement du studio...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col relative min-h-screen overflow-hidden p-4 md:p-6 lg:p-12">
      {/* Effets de fond */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-4xl w-full mx-auto relative z-10 flex-1 flex flex-col justify-center">
        
        <AnimatePresence mode="wait">
          
          {/* MENU STATE */}
          {gameState === 'menu' && (
            <motion.div 
              key="menu"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 mb-8 shadow-2xl shadow-indigo-500/20">
                <Gamepad2 className="w-10 h-10" />
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-400 mb-4">
                VicozQuiz
              </h1>
              <p className="text-zinc-400 text-lg mb-12 max-w-lg mx-auto">
                Testez vos connaissances sur les œuvres que vous avez regardées ! 10 questions, 10 secondes par question.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
                <button 
                  onClick={() => generateQuestions('director')}
                  className="group relative min-h-[44px] p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl hover:bg-indigo-500/10 hover:border-indigo-500/50 transition-all duration-300 text-left overflow-hidden flex flex-col"
                >
                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                    <Clapperboard className="w-32 h-32 text-indigo-400" />
                  </div>
                  <Clapperboard className="w-8 h-8 text-indigo-400 mb-4" />
                  <h3 className="text-xl font-bold text-zinc-100 mb-2">Réalisateurs</h3>
                  <p className="text-zinc-500 text-sm">Qui a réalisé quoi ? Retrouvez les maîtres derrière la caméra.</p>
                </button>

                <button 
                  onClick={() => generateQuestions('actor')}
                  className="group relative min-h-[44px] p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl hover:bg-blue-500/10 hover:border-blue-500/50 transition-all duration-300 text-left overflow-hidden flex flex-col"
                >
                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                    <Users className="w-32 h-32 text-blue-400" />
                  </div>
                  <Users className="w-8 h-8 text-blue-400 mb-4" />
                  <h3 className="text-xl font-bold text-zinc-100 mb-2">Acteurs</h3>
                  <p className="text-zinc-500 text-sm">Qui a joué ce rôle ? Retrouvez les stars de vos films et séries.</p>
                </button>

                <button 
                  onClick={() => generateQuestions('all')}
                  className="group relative min-h-[44px] p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all duration-300 text-left overflow-hidden flex flex-col md:col-span-1 sm:col-span-2"
                >
                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                    <Sparkles className="w-32 h-32 text-emerald-400" />
                  </div>
                  <Sparkles className="w-8 h-8 text-emerald-400 mb-4" />
                  <h3 className="text-xl font-bold text-zinc-100 mb-2">Mélange Total</h3>
                  <p className="text-zinc-500 text-sm">Le test ultime. Réalisateurs, acteurs, rôles... tout y passe !</p>
                </button>
              </div>
            </motion.div>
          )}

          {/* PLAYING STATE */}
          {gameState === 'playing' && (
            <motion.div 
              key="playing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full max-w-2xl mx-auto"
            >
              {/* Header Jeu */}
              <div className="flex items-center justify-between mb-8">
                <div className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl font-bold text-zinc-400">
                  Question <span className="text-white">{currentIndex + 1}</span> / 10
                </div>
                
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold border transition-colors ${
                  timeLeft <= 3 ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-zinc-900 border-zinc-800 text-zinc-100'
                }`}>
                  <Timer className="w-5 h-5" />
                  <span>{timeLeft}s</span>
                </div>
              </div>

              {/* Progress bar temps */}
              <div className="w-full h-2 bg-zinc-900 rounded-full mb-10 overflow-hidden">
                <motion.div 
                  initial={{ width: "100%" }}
                  animate={{ width: `${(timeLeft / 10) * 100}%` }}
                  transition={{ duration: 1, ease: "linear" }}
                  className={`h-full rounded-full ${timeLeft <= 3 ? 'bg-red-500' : 'bg-indigo-500'}`}
                />
              </div>

              {/* Question */}
              <div className="text-center mb-12">
                <p className="text-sm text-indigo-400 font-semibold tracking-widest uppercase mb-4">
                  {questions[currentIndex].context}
                </p>
                <h2 className="text-xl md:text-2xl lg:text-3xl font-bold leading-tight">
                  {questions[currentIndex].text}
                </h2>
              </div>

              {/* Choix */}
              <div className="flex flex-col gap-3">
                {questions[currentIndex].choices.map((choice, index) => {
                  let btnStateClass = "bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-600 text-zinc-300";
                  
                  if (isAnswerRevealed) {
                    if (choice === questions[currentIndex].correctAnswer) {
                      btnStateClass = "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"; // Bonne réponse
                    } else if (choice === selectedAnswer) {
                      btnStateClass = "bg-red-500/20 border-red-500/50 text-red-400"; // Mauvaise sélectionnée
                    } else {
                      btnStateClass = "bg-zinc-950 border-zinc-900 text-zinc-600 opacity-50"; // Les autres
                    }
                  }

                  return (
                    <button
                      key={index}
                      disabled={isAnswerRevealed}
                      onClick={() => handleAnswer(choice)}
                      className={`relative w-full p-3 md:p-4 min-h-[48px] rounded-xl border-2 text-left font-medium transition-all duration-300 flex items-center justify-between group ${btnStateClass}`}
                    >
                      <span>{choice}</span>
                      {!isAnswerRevealed && (
                        <div className="w-6 h-6 rounded-full border-2 border-zinc-700 group-hover:border-zinc-500 transition-colors" />
                      )}
                      {isAnswerRevealed && choice === questions[currentIndex].correctAnswer && (
                        <Check className="w-5 h-5 text-emerald-400" />
                      )}
                      {isAnswerRevealed && choice === selectedAnswer && choice !== questions[currentIndex].correctAnswer && (
                        <X className="w-5 h-5 text-red-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* RESULT STATE */}
          {gameState === 'result' && (
            <motion.div 
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center bg-zinc-900/50 border border-zinc-800 p-6 md:p-8 lg:p-12 rounded-3xl backdrop-blur-md max-w-xl mx-auto w-full"
            >
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-amber-500/20 border-4 border-amber-500/30 text-amber-400 mb-6 shadow-2xl shadow-amber-500/20">
                <Trophy className="w-12 h-12" />
              </div>
              
              <h2 className="text-3xl font-bold text-white mb-2">Partie Terminée !</h2>
              <p className="text-zinc-400 mb-8">Voici votre score final</p>

              <div className="flex items-end justify-center gap-2 mb-10">
                <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-500 leading-none">
                  {score}
                </span>
                <span className="text-2xl font-bold text-zinc-600 mb-1">/ 10</span>
              </div>

              <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-800 to-transparent mb-10" />

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => generateQuestions(mode)}
                  className="w-full sm:w-auto min-h-[44px] px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
                >
                  <RotateCcw className="w-5 h-5" />
                  Rejouer
                </button>
                <button
                  onClick={resetGame}
                  className="w-full sm:w-auto min-h-[44px] px-8 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all"
                >
                  Menu principal
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
