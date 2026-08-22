import { useState, useRef, useEffect } from "react";
import { questions as defaultQuestions } from "../data/questions.js";
import { createCheckin, getSettings, updateCheckin } from "../data/api.js";
import OptionButton from "../components/OptionButton.jsx";

const initialAnswers = { whatHappened: null, angerLevel: null, whatWants: null };

export default function CheckIn() {
  const [questions, setQuestions] = useState(defaultQuestions);
  const [answers, setAnswers] = useState(initialAnswers);
  // "idle" | "saving" | "saved" | "error"
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // The id of the record representing the current in-progress check-in,
  // and whether that record already has all three answers.
  const currentRecordId = useRef(null);
  const sessionComplete = useRef(false);

  useEffect(() => {
    getSettings().then(setQuestions);
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

  function selectAnswer(questionId, label) {
    const updatedAnswers = { ...answers, [questionId]: label };
    setAnswers(updatedAnswers);
    saveAnswers(updatedAnswers);
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
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <header className="text-center mb-8">
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-ink mb-2">
          How are you feeling?
        </h1>
        <p className="text-mist text-sm sm:text-base">
          Choose the answers that feel closest. You don't need to type anything.
        </p>
      </header>

      <div className="space-y-8">
        {visibleQuestions.map((question, index) => {
          const isUnlocked =
            index === 0 || Boolean(answers[visibleQuestions[index - 1].id]);
          if (!isUnlocked) return null;

          return (
            <section
              key={question.id}
              className="animate-[fadeIn_0.25s_ease-out]"
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
                    onClick={() => selectAnswer(question.id, option.label)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-8" aria-live="polite">
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
            <button
              type="button"
              onClick={startOver}
              className="px-6 py-2.5 rounded-2xl font-display font-semibold text-sm bg-calm text-white hover:bg-calmDark transition-colors"
            >
              Start a New Check-In
            </button>
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
      </div>
    </div>
  );
}
