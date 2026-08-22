import { useEffect, useState } from "react";
import { getSettings, saveSettings } from "../data/api.js";

export default function Settings() {
  const [questions, setQuestions] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    getSettings().then((value) => {
      setQuestions(value);
      setStatus("ready");
    });
  }, []);

  function updateQuestion(index, changes) {
    setQuestions((current) =>
      current.map((question, questionIndex) =>
        questionIndex === index ? { ...question, ...changes } : question,
      ),
    );
  }

  function updateOption(questionIndex, optionIndex, changes) {
    setQuestions((current) =>
      current.map((question, index) =>
        index === questionIndex
          ? {
              ...question,
              options: question.options.map((option, currentOptionIndex) =>
                currentOptionIndex === optionIndex ? { ...option, ...changes } : option,
              ),
            }
          : question,
      ),
    );
  }

  function addOption(questionIndex) {
    setQuestions((current) =>
      current.map((question, index) =>
        index === questionIndex
          ? { ...question, options: [...question.options, { emoji: "🙂", label: "New answer" }] }
          : question,
      ),
    );
  }

  function removeOption(questionIndex, optionIndex) {
    setQuestions((current) =>
      current.map((question, index) =>
        index === questionIndex
          ? { ...question, options: question.options.filter((_, itemIndex) => itemIndex !== optionIndex) }
          : question,
      ),
    );
  }

  async function handleSave(event) {
    event.preventDefault();
    setStatus("saving");
    setError("");
    try {
      await saveSettings(questions);
      setStatus("saved");
    } catch (err) {
      console.error(err);
      setError("We couldn't save the settings. Check Appwrite permissions.");
      setStatus("ready");
    }
  }

  if (status === "loading") {
    return <p className="text-mist text-center py-16">Loading settings…</p>;
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <header className="mb-7">
        <h1 className="font-display font-bold text-2xl text-ink mb-1">Check-In Settings</h1>
        <p className="text-mist text-sm">Customize the headers and answer choices visitors see.</p>
      </header>

      <form onSubmit={handleSave} className="space-y-5">
        {questions.map((question, questionIndex) => (
          <section key={question.id} className="bg-white rounded-3xl shadow-soft p-5">
            <label className="block mb-4">
              <span className="text-mist text-xs uppercase tracking-wide font-medium">Question header</span>
              <input
                value={question.title}
                onChange={(event) => updateQuestion(questionIndex, { title: event.target.value })}
                required
                className="mt-1 w-full px-3 py-2.5 rounded-xl border border-ink/10 text-ink"
              />
            </label>

            <div className="space-y-2">
              {question.options.map((option, optionIndex) => (
                <div key={`${question.id}-${optionIndex}`} className="flex gap-2">
                  <input
                    aria-label="Answer emoji"
                    value={option.emoji}
                    onChange={(event) => updateOption(questionIndex, optionIndex, { emoji: event.target.value })}
                    maxLength={4}
                    className="w-16 px-2 py-2 rounded-xl border border-ink/10 text-center"
                  />
                  <input
                    aria-label="Answer text"
                    value={option.label}
                    onChange={(event) => updateOption(questionIndex, optionIndex, { label: event.target.value })}
                    required
                    className="flex-1 px-3 py-2 rounded-xl border border-ink/10 text-ink"
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(questionIndex, optionIndex)}
                    className="px-3 rounded-xl text-bloomDark bg-bloom/10"
                    aria-label="Remove answer"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => addOption(questionIndex)}
              className="mt-3 px-3.5 py-2 rounded-2xl font-display font-semibold text-sm text-calm bg-calm/10"
            >
              Add Answer
            </button>
          </section>
        ))}

        {error && <p className="text-bloomDark bg-bloom/10 rounded-2xl px-4 py-3 text-sm">{error}</p>}
        {status === "saved" && <p className="text-calm text-sm text-center">Settings saved.</p>}
        <button
          type="submit"
          disabled={status === "saving"}
          className="w-full px-6 py-3 rounded-2xl font-display font-semibold bg-bloom text-white disabled:opacity-50"
        >
          {status === "saving" ? "Saving…" : "Save Settings"}
        </button>
      </form>
    </main>
  );
}
