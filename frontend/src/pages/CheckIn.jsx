import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { questions as defaultQuestions } from "../data/questions.js";
import { createCheckin, getSettings, updateCheckin } from "../data/api.js";
import OptionButton from "../components/OptionButton.jsx";

const initialAnswers = { whatHappened: null, angerLevel: null, whatWants: null };

export default function CheckIn() {
  const [questions, setQuestions] = useState(defaultQuestions);
  const [intro, setIntro] = useState({
    title: "How are you feeling?",
    description: "Choose the answers that feel closest. You don't need to type anything.",
  });
  const [answers, setAnswers] = useState(initialAnswers);
  // "idle" | "saving" | "saved" | "error"
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [celebration, setCelebration] = useState(null);

  // The id of the record representing the current in-progress check-in,
  // and whether that record already has all three answers.
  const currentRecordId = useRef(null);
  const sessionComplete = useRef(false);
  const celebrationTimer = useRef(null);

  useEffect(() => {
    getSettings().then((settings) => {
      setQuestions(settings.questions);
      setIntro({ title: settings.title, description: settings.description });
    });
  }, []);

  const visibleQuestions = questions.filter((question) => question.visible !== false);
  const allAnswered = visibleQuestions.every((q) => Boolean(answers[q.id]));

  async function saveAnswers(updatedAnswers) {
    setStatus("saving");
    setErrorMessage("");

    const willBeComplete = visibleQuestions.every((q) => Boolean(updatedAnswers[q.id]));

    try {
      if (!currentRecordId.current) {
        // First answer of a fresh check-in — create the record right away.
        const { checkin } = await createCheckin(updatedAnswers, questions);
        currentRecordId.current = checkin.id;
      } else if (!sessionComplete.current) {
        // Still filling this one in — keep updating the same record.
        await updateCheckin(currentRecordId.current, updatedAnswers);
      } else {
        // This check-in was already finished — an edit now starts a new
        // record so the finished one stays exactly as it was.
        const { checkin } = await createCheckin(updatedAnswers, questions);
        currentRecordId.current = checkin.id;
      }
      sessionComplete.current = willBeComplete;
      setStatus("saved");
    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrorMessage("We couldn't save your answer. Please try again.");
    }
  }

  function selectAnswer(questionId, option) {
    const updatedAnswers = { ...answers, [questionId]: option.label };
    setAnswers(updatedAnswers);
    saveAnswers(updatedAnswers);

    window.clearTimeout(celebrationTimer.current);
    setCelebration({
      id: Date.now(),
      emoji: option.emoji,
      message: "Great choice — thanks for checking in!",
    });
    celebrationTimer.current = window.setTimeout(() => setCelebration(null), 1600);
  }

  function retrySave() {
    saveAnswers(answers);
  }

  function startOver() {
    setAnswers(initialAnswers);
    currentRecordId.current = null;
    sessionComplete.current = false;
    setStatus("idle");
    setErrorMessage("");
    setCelebration(null);
    window.clearTimeout(celebrationTimer.current);
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <header className="text-center mb-8">
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-ink mb-2">
          {intro.title}
        </h1>
        <p className="text-mist text-sm sm:text-base">
          {intro.description}
        </p>
      </header>

      <AnimatePresence>
        {celebration && (
          <motion.div
            key={celebration.id}
            initial={{ opacity: 0, scale: 0.65, y: -18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: -12 }}
            transition={{ type: "spring", stiffness: 340, damping: 20 }}
            className="fixed left-1/2 top-24 z-30 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 overflow-hidden rounded-3xl border border-bloom/20 bg-white/95 p-5 text-center shadow-xl backdrop-blur"
            role="status"
          >
            {["✨", "💫", "⭐", "✨"].map((sparkle, index) => (
              <motion.span
                key={`${celebration.id}-${index}`}
                initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  x: [-10, -72, 62, 80][index],
                  y: [-10, -42, -48, 5][index],
                  scale: [0, 1.2, 0.7],
                  rotate: [0, -35, 25, 45][index],
                }}
                transition={{ duration: 1, delay: index * 0.06 }}
                className="absolute left-1/2 top-1/2 text-xl"
                aria-hidden="true"
              >
                {sparkle}
              </motion.span>
            ))}
            <motion.div
              initial={{ rotate: -12, scale: 0.5 }}
              animate={{ rotate: [0, -8, 8, 0], scale: 1 }}
              className="relative mb-2 text-5xl"
              aria-hidden="true"
            >
              {celebration.emoji}
            </motion.div>
            <p className="relative font-display font-bold text-ink">{celebration.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-8">
        <AnimatePresence initial={false}>
        {visibleQuestions.map((question, index) => {
          const isUnlocked =
            index === 0 || Boolean(answers[visibleQuestions[index - 1].id]);
          if (!isUnlocked) return null;

          return (
            <motion.section
              key={question.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
            >
              <h2 className="font-display font-semibold text-lg text-ink mb-3">
                {question.title}
              </h2>
              <div className="grid gap-2.5">
                {question.options.map((option) => (
                  <OptionButton
                    key={option.label}
                    emoji={option.emoji}
                    label={option.label}
                    selected={answers[question.id] === option.label}
                    onClick={() => selectAnswer(question.id, option)}
                  />
                ))}
              </div>
            </motion.section>
          );
        })}
        </AnimatePresence>
      </div>

      <motion.div layout className="mt-8" aria-live="polite">
        {status === "saving" && (
          <p className="text-mist text-sm font-medium text-center">Saving…</p>
        )}

        {status === "saved" && !allAnswered && (
          <p className="text-mist text-sm text-center">
            Saved. Keep going whenever you're ready.
          </p>
        )}

        {status === "saved" && allAnswered && (
          <div className="text-center">
            <p className="font-display font-bold text-lg text-ink mb-1">
              Thank you for telling me.
            </p>
            <p className="text-mist text-sm mb-4">
              Change any answer above to save a new check-in.
            </p>
            <motion.button
              type="button"
              onClick={startOver}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              className="px-6 py-2.5 rounded-2xl font-display font-semibold text-sm bg-calm text-white hover:bg-calmDark transition-colors"
            >
              Start a New Check-In
            </motion.button>
          </div>
        )}

        {status === "error" && (
          <div className="text-center">
            <p className="text-bloomDark bg-bloom/10 rounded-2xl px-4 py-3 text-sm font-medium mb-4">
              {errorMessage}
            </p>
            <button
              type="button"
              onClick={retrySave}
              className="px-6 py-2.5 rounded-2xl font-display font-semibold text-sm bg-bloom text-white hover:bg-bloomDark transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
