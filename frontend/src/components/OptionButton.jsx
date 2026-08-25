import { motion } from "framer-motion";

export default function OptionButton({ emoji, label, selected, onClick }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.97 }}
      animate={{ scale: selected ? 1.015 : 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 24 }}
      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-left transition-colors
        ${
          selected
            ? "bg-bloom/10 border-bloom text-bloomDark shadow-soft"
            : "bg-white border-transparent text-ink hover:border-ink/10"
        }`}
    >
      <motion.span
        className="text-2xl leading-none"
        aria-hidden="true"
        animate={{ rotate: selected ? [0, -10, 10, 0] : 0, scale: selected ? [1, 1.2, 1] : 1 }}
        transition={{ duration: 0.35 }}
      >
        {emoji}
      </motion.span>
      <span className="font-medium text-[15px] sm:text-base">{label}</span>
      {selected && (
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="ml-auto grid h-6 w-6 place-items-center rounded-full bg-bloom text-xs text-white"
          aria-hidden="true"
        >
          ✓
        </motion.span>
      )}
    </motion.button>
  );
}