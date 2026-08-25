import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import ClickSpark from "../components/ClickSpark.jsx";

const flavors = [
  { name: "Strawberry", emoji: "🍓", color: "#F8A5B5", accent: "#D94F70" },
  { name: "Chocolate", emoji: "🍫", color: "#9A654E", accent: "#653A2A" },
  { name: "Vanilla", emoji: "🌼", color: "#FFF0B8", accent: "#E0A83F" },
  { name: "Mint", emoji: "🌿", color: "#8ED9C5", accent: "#2F8F7C" },
  { name: "Blueberry", emoji: "🫐", color: "#A9A2EE", accent: "#655BC2" },
  { name: "Mango", emoji: "🥭", color: "#FFD166", accent: "#E99A22" },
];

const toppings = [
  { name: "Sprinkles", emoji: "🌈" },
  { name: "Cherry", emoji: "🍒" },
  { name: "Cookie", emoji: "🍪" },
  { name: "Honey", emoji: "🍯" },
  { name: "Berries", emoji: "🫐" },
  { name: "Marshmallow", emoji: "☁️" },
];

const confetti = ["🍬", "✨", "⭐", "🍭", "💫", "🎉", "🍓", "🌈"];

export default function IceCreamGame() {
  const [flavor, setFlavor] = useState(flavors[0]);
  const [ingredients, setIngredients] = useState([]);
  const [customIngredient, setCustomIngredient] = useState("");
  const [scoops, setScoops] = useState(1);
  const [score, setScore] = useState(0);
  const [enjoyed, setEnjoyed] = useState(false);

  const creationName = useMemo(() => {
    const extra = ingredients.length ? ` with ${ingredients[0].name}` : " Dream";
    return `${flavor.name}${extra}`;
  }, [flavor, ingredients]);

  function toggleTopping(topping) {
    setEnjoyed(false);
    setIngredients((current) =>
      current.some((item) => item.name === topping.name)
        ? current.filter((item) => item.name !== topping.name)
        : [...current, { ...topping, id: topping.name }],
    );
  }

  function addCustomIngredient(event) {
    event.preventDefault();
    const name = customIngredient.trim();
    if (!name) return;
    setIngredients((current) => [
      ...current,
      { name, emoji: "✨", id: `custom-${Date.now()}` },
    ]);
    setCustomIngredient("");
    setEnjoyed(false);
  }

  function enjoyCreation() {
    if (enjoyed) return;
    setScore((current) => current + 10 + scoops * 5 + ingredients.length * 2);
    setEnjoyed(true);
  }

  function makeAnother() {
    setIngredients([]);
    setScoops(1);
    setEnjoyed(false);
  }

  return (
    <ClickSpark
      sparkColors={["#FFD88A", flavor.color, "#FFFFFF"]}
      sparkCount={12}
      sparkRadius={34}
      sparkSize={14}
      duration={600}
    >
    <main className="relative min-h-[calc(100vh-70px)] overflow-hidden px-4 py-8 sm:py-12">
      <motion.div
        aria-hidden="true"
        className="absolute -left-20 top-20 h-56 w-56 rounded-full bg-bloom/10 blur-3xl"
        animate={{ scale: [1, 1.18, 1], x: [0, 20, 0] }}
        transition={{ duration: 7, repeat: Infinity }}
      />
      <motion.div
        aria-hidden="true"
        className="absolute -right-16 bottom-10 h-64 w-64 rounded-full bg-calm/15 blur-3xl"
        animate={{ scale: [1.1, 0.95, 1.1], y: [0, -20, 0] }}
        transition={{ duration: 8, repeat: Infinity }}
      />

      <div className="relative mx-auto max-w-5xl">
        <header className="mb-8 text-center">
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-2 font-display font-bold uppercase tracking-[0.22em] text-bloomDark"
          >
            Made exclusively for Marry
          </motion.p>
          <h1 className="font-display text-4xl font-bold text-white sm:text-5xl">
            Marry’s Ice Cream Shop
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/60 sm:text-base">
            A little premium scoop studio made especially for Marry. Pick a flavor, add magical ingredients, and enjoy.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section
            className="relative min-h-[620px] overflow-hidden rounded-3xl border border-white/10 bg-[#171329] p-6 shadow-[0_24px_70px_-24px_rgba(37,28,66,0.7)]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 50% 42%, rgba(245,185,95,0.22), transparent 34%), radial-gradient(circle at 10% 10%, rgba(232,121,138,0.2), transparent 28%), linear-gradient(145deg, #241C3B, #100D20 75%)",
            }}
          >
            <div className="absolute inset-x-10 top-28 h-72 rounded-full border border-white/5 bg-white/[0.025] blur-[1px]" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Marry’s signature creation</p>
                <h2 className="font-display text-xl font-bold text-white">{creationName}</h2>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-right shadow-lg backdrop-blur-md">
                <p className="text-xs font-semibold tracking-wider text-white/45">SCORE</p>
                <motion.p key={score} initial={{ scale: 1.4 }} animate={{ scale: 1 }} className="font-display text-xl font-bold text-[#FFD88A]">
                  {score}
                </motion.p>
              </div>
            </div>

            <div className="relative mx-auto mt-7 flex h-[440px] w-72 items-end justify-center">
              <motion.div
                aria-hidden="true"
                className="absolute bottom-0 h-8 w-56 rounded-[50%] bg-black/45 blur-md"
                animate={{ scaleX: [1, 0.9, 1], opacity: [0.45, 0.3, 0.45] }}
                transition={{ duration: 4, repeat: Infinity }}
              />
              <AnimatePresence mode="popLayout">
                {Array.from({ length: scoops }).map((_, index) => (
                  <motion.div
                    key={`${flavor.name}-${index}`}
                    initial={{ opacity: 0, y: -140, scale: 0.6, rotate: -15 }}
                    animate={{ opacity: 1, y: 0, scale: 1, rotate: index % 2 ? 3 : -2 }}
                    exit={{ opacity: 0, y: 30, scale: 0.5 }}
                    transition={{ type: "spring", stiffness: 230, damping: 17, delay: index * 0.08 }}
                    className="absolute z-10 h-36 w-36 border border-white/30"
                    style={{
                      borderRadius: "48% 52% 45% 55% / 52% 48% 56% 44%",
                      background: `radial-gradient(circle at 32% 24%, rgba(255,255,255,.62) 0 5%, transparent 24%), linear-gradient(145deg, ${flavor.color}, ${flavor.accent})`,
                      boxShadow: `inset -18px -18px 28px ${flavor.accent}55, inset 12px 12px 22px rgba(255,255,255,.25), 0 22px 35px rgba(0,0,0,.3)`,
                      bottom: 142 + index * 84,
                      left: 72 + (index % 2 ? 12 : -10),
                    }}
                  >
                    <AnimatePresence>
                      {ingredients.flatMap((item, toppingIndex) =>
                        Array.from({ length: 3 }, (_, particleIndex) => {
                          const particleSeed = toppingIndex * 3 + particleIndex;
                          return (
                            <motion.span
                              key={`${item.id}-${particleIndex}`}
                              initial={{
                                opacity: 0,
                                scale: 0.25,
                                x: particleIndex % 2 ? -28 : 28,
                                y: -190 - particleIndex * 25,
                                rotate: particleIndex % 2 ? -160 : 160,
                              }}
                              animate={{
                                opacity: 1,
                                scale: [0.4, 1.2, 0.82],
                                x: 0,
                                y: 0,
                                rotate: 0,
                              }}
                              exit={{ opacity: 0, scale: 0, y: 24 }}
                              transition={{
                                type: "spring",
                                stiffness: 135,
                                damping: 13,
                                delay: particleIndex * 0.11 + index * 0.08,
                              }}
                              className="absolute z-20 text-base drop-shadow-[0_3px_3px_rgba(0,0,0,0.3)]"
                              style={{
                                left: `${12 + (particleSeed * 31) % 70}%`,
                                top: `${10 + (particleSeed * 23) % 65}%`,
                              }}
                              aria-label={particleIndex === 0 ? item.name : undefined}
                              aria-hidden={particleIndex !== 0}
                            >
                              {item.emoji}
                            </motion.span>
                          );
                        }),
                      )}
                    </AnimatePresence>
                    <span className="absolute left-7 top-7 h-4 w-10 -rotate-[24deg] rounded-full bg-white/30 blur-[1px]" />
                    <span className="absolute bottom-1 left-6 h-7 w-7 translate-y-3 rounded-full" style={{ background: flavor.accent }} />
                    <span className="absolute bottom-0 left-[52px] h-10 w-8 translate-y-4 rounded-full" style={{ background: flavor.accent }} />
                    <span className="absolute bottom-1 right-6 h-6 w-6 translate-y-2 rounded-full" style={{ background: flavor.accent }} />
                  </motion.div>
                ))}
              </AnimatePresence>

              <motion.div
                className="absolute bottom-3 h-48 w-48 drop-shadow-[0_24px_18px_rgba(0,0,0,0.38)]"
                animate={{ rotate: enjoyed ? [0, -4, 4, 0] : 0 }}
              >
                <div className="absolute left-2 top-0 z-10 h-12 w-44 rounded-[50%] border-2 border-[#6D3A24] bg-gradient-to-b from-[#8B5132] via-[#4D281C] to-[#2D1711] shadow-[inset_0_5px_8px_rgba(255,255,255,0.18),0_6px_8px_rgba(0,0,0,0.3)]">
                  <div className="mx-auto mt-2 h-4 w-32 rounded-[50%] bg-[#1D0F0B]/80" />
                </div>
                <div
                  className="absolute left-3 top-6 h-40 overflow-hidden"
                  style={{
                    width: "168px",
                    clipPath: "polygon(3% 0, 97% 0, 50% 100%)",
                    background: "linear-gradient(100deg, #9B5D2E 0%, #E8B86D 35%, #C88642 68%, #75401F 100%)",
                  }}
                >
                  <div
                    className="h-full w-full opacity-45"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(45deg, transparent 0 14px, #6B371C 15px 18px), repeating-linear-gradient(-45deg, transparent 0 14px, #6B371C 15px 18px)",
                    }}
                  />
                  <div className="absolute left-1/2 top-16 grid h-12 w-12 -translate-x-1/2 place-items-center rounded-full border-2 border-[#FFF1C6]/70 bg-gradient-to-br from-[#F4CE75] to-[#A96A2B] font-display text-xl font-bold text-[#4A2717] shadow-lg">
                    S
                  </div>
                  <div className="absolute left-7 top-7 h-28 w-5 -rotate-6 rounded-full bg-white/15 blur-sm" />
                </div>
              </motion.div>
            </div>

            <AnimatePresence>
              {enjoyed && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 grid place-items-center bg-ink/20 p-5 backdrop-blur-sm"
                >
                  {confetti.map((piece, index) => (
                    <motion.span
                      key={`${piece}-${index}`}
                      className="absolute text-3xl"
                      initial={{ x: 0, y: 20, opacity: 0, scale: 0 }}
                      animate={{
                        x: [-150, -100, -50, 15, 65, 110, 145, 175][index],
                        y: [-140, 120, -175, 150, -125, 105, -155, 135][index],
                        opacity: [0, 1, 1, 0],
                        scale: [0, 1.3, 1],
                        rotate: index % 2 ? 160 : -160,
                      }}
                      transition={{ duration: 1.8, delay: index * 0.05, repeat: Infinity, repeatDelay: 0.6 }}
                    >
                      {piece}
                    </motion.span>
                  ))}
                  <motion.div initial={{ y: 25 }} animate={{ y: 0 }} className="relative rounded-3xl bg-white p-6 text-center shadow-xl">
                    <p className="text-5xl">😋</p>
                    <h3 className="mt-2 font-display text-2xl font-bold text-ink">Made perfectly for Marry!</h3>
                    <p className="mt-1 text-sm text-mist">You earned {10 + scoops * 5 + ingredients.length * 2} points.</p>
                    <button type="button" onClick={makeAnother} className="mt-4 rounded-2xl bg-calm px-5 py-2.5 font-display font-bold text-white hover:bg-calmDark">
                      Make Marry another
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          <section className="space-y-5 rounded-3xl bg-white p-5 shadow-soft sm:p-7">
            <ControlSection number="1" title="Choose a flavor">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {flavors.map((item) => (
                  <motion.button
                    key={item.name}
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={() => {
                      setFlavor(item);
                      setEnjoyed(false);
                    }}
                    className={`rounded-2xl border-2 p-3 text-left transition-colors ${
                      flavor.name === item.name ? "border-bloom bg-bloom/10" : "border-ink/5 hover:border-ink/15"
                    }`}
                  >
                    <span className="text-2xl">{item.emoji}</span>
                    <span className="mt-1 block text-sm font-semibold text-ink">{item.name}</span>
                  </motion.button>
                ))}
              </div>
            </ControlSection>

            <ControlSection number="2" title="How many scoops?">
              <div className="flex gap-2">
                {[1, 2, 3].map((count) => (
                  <motion.button
                    key={count}
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      setScoops(count);
                      setEnjoyed(false);
                    }}
                    className={`flex-1 rounded-2xl py-2.5 font-display font-bold ${scoops === count ? "bg-sunny text-white" : "bg-cloud text-ink"}`}
                  >
                    {"🍨".repeat(count)}
                  </motion.button>
                ))}
              </div>
            </ControlSection>

            <ControlSection number="3" title="Add ingredients">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {toppings.map((item) => {
                  const selected = ingredients.some((ingredient) => ingredient.name === item.name);
                  return (
                    <motion.button
                      key={item.name}
                      type="button"
                      whileTap={{ scale: 0.94 }}
                      aria-pressed={selected}
                      onClick={() => toggleTopping(item)}
                      className={`rounded-2xl px-3 py-2.5 text-sm font-semibold ${selected ? "bg-calm text-white" : "bg-cloud text-ink hover:bg-calm/10"}`}
                    >
                      {item.emoji} {item.name}
                    </motion.button>
                  );
                })}
              </div>
              <form onSubmit={addCustomIngredient} className="mt-3 flex gap-2">
                <input
                  value={customIngredient}
                  onChange={(event) => setCustomIngredient(event.target.value)}
                  maxLength={24}
                  placeholder="Your own ingredient..."
                  aria-label="Custom ingredient"
                  className="min-w-0 flex-1 rounded-2xl border border-ink/10 px-4 py-2.5 text-sm outline-none focus:border-calm"
                />
                <motion.button whileTap={{ scale: 0.94 }} type="submit" className="rounded-2xl bg-ink px-4 py-2.5 font-display font-bold text-white">
                  Add
                </motion.button>
              </form>
              <AnimatePresence>
                {ingredients.length > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 flex flex-wrap gap-2">
                    {ingredients.map((item) => (
                      <motion.button
                        layout
                        exit={{ opacity: 0, scale: 0.5 }}
                        key={item.id}
                        type="button"
                        onClick={() => setIngredients((current) => current.filter((ingredient) => ingredient.id !== item.id))}
                        className="rounded-full bg-sunny/15 px-3 py-1.5 text-xs font-semibold text-ink"
                        title="Remove ingredient"
                      >
                        {item.emoji} {item.name} ×
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </ControlSection>

            <motion.button
              type="button"
              onClick={enjoyCreation}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              className="w-full rounded-2xl bg-gradient-to-r from-bloom to-sunny px-5 py-4 font-display text-lg font-bold text-white shadow-soft"
            >
              Enjoy my ice cream! 🎉
            </motion.button>
          </section>
        </div>
      </div>
    </main>
    </ClickSpark>
  );
}

function ControlSection({ number, title, children }) {
  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-ink">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-bloom/10 text-sm text-bloomDark">{number}</span>
        {title}
      </h2>
      {children}
    </div>
  );
}
