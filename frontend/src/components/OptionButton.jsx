export default function OptionButton({ emoji, label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-left transition-colors
        ${
          selected
            ? "bg-bloom/10 border-bloom text-bloomDark"
            : "bg-white border-transparent text-ink hover:border-ink/10"
        }`}
    >
      <span className="text-2xl leading-none" aria-hidden="true">
        {emoji}
      </span>
      <span className="font-medium text-[15px] sm:text-base">{label}</span>
    </button>
  );
}
