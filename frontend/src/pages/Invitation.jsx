import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Clock, Coffee, Leaf, Loader2, Mail, Utensils } from "lucide-react";
import { ID } from "../appwrite.js";
import { makeInvitationResponse, saveInvitationResponse } from "../data/invitations.js";
import { Button } from "../components/ui/button.jsx";
import { Card, CardContent } from "../components/ui/card.jsx";

export default function Invitation() {
  const tokenFromUrl = new URLSearchParams(window.location.search).get("next");
  const [step, setStep] = useState(tokenFromUrl ? "checking" : "permission");
  const [followup, setFollowup] = useState(null);
  const [delivery, setDelivery] = useState({ method: "WhatsApp", contact: "" });
  const [linkCopied, setLinkCopied] = useState(false);
  const [choice, setChoice] = useState(null);
  const [saveState, setSaveState] = useState("idle");
  const [error, setError] = useState("");
  const [details, setDetails] = useState({ date: "", time: "", contact_method: "WhatsApp", contact: "" });
  const [detailsError, setDetailsError] = useState("");
  const [sharedDetails, setSharedDetails] = useState(false);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const today = new Date();
  const minimumDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const reduceMotion = useReducedMotion();
  const focusHeading = useCallback(node => node?.focus({ preventScroll: true }), []);
  const session = useRef(null);
  const queue = useRef([]);
  const saving = useRef(false);
  const stepLock = useRef("permission");
  const followupToken = tokenFromUrl || followup?.token;

  useEffect(() => {
    if (!followupToken || !["checking", "waiting"].includes(step)) return;
    let active = true;
    const check = async () => {
      try {
        const response = await fetch(`/api/invitations?next=${encodeURIComponent(followupToken)}`, { cache: "no-store", signal: AbortSignal.timeout(20000) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "We couldn't open this link. Please try again.");
        if (!active) return;
        setFollowup({ token: followupToken, availableAt: result.availableAt });
        if (result.ready) {
          session.current = result.sessionId;
          stepLock.current = "invitation";
          setStep("invitation");
        } else setStep("waiting");
      } catch (err) { if (active) { setError(err.message); setStep("followup-error"); } }
    };
    void check();
    const timer = window.setInterval(check, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, [followupToken, step]);

  async function flushResponses() {
    if (saving.current || !queue.current.length) return;
    saving.current = true;
    setSaveState("saving");
    setError("");
    try {
      while (queue.current.length) {
        const result = await saveInvitationResponse(queue.current[0]);
        if (result.followup) setFollowup(result.followup);
        queue.current.shift();
      }
      setSaveState("saved");
    } catch (err) {
      setSaveState("error");
      setError(err.message);
    } finally {
      saving.current = false;
    }
  }

  function respond(stage, answer) {
    // Prevent double taps from recording the same step twice.
    if (stepLock.current !== stage) return;
    session.current ??= ID.unique();
    queue.current.push(makeInvitationResponse(session.current, stage, answer, stage === "invitation" ? followupToken : undefined));
    const next = answer === "no" ? "declined" : answer === "maybe" ? "deferred" : stage === "permission" ? "delivery" : "accepted";
    stepLock.current = next;
    setChoice(answer);
    setStep(next);
    void flushResponses();
  }

  function submitDelivery(event, skip = false) {
    event?.preventDefault();
    if (stepLock.current !== "delivery") return;
    if (!skip && !delivery.contact.trim()) return;
    queue.current.push(makeInvitationResponse(session.current, "delivery_method", skip ? "Later" : delivery.method));
    if (!skip) queue.current.push(makeInvitationResponse(session.current, "delivery_contact", delivery.contact.trim()));
    stepLock.current = "waiting";
    setStep("waiting");
    void flushResponses();
  }

  async function copyReturnLink() {
    try { await navigator.clipboard.writeText(`${window.location.origin}/invitation?next=${encodeURIComponent(followupToken)}`); setLinkCopied(true); }
    catch { setError("Please open the return link below and save its address."); }
  }

  function submitDetails(event) {
    event.preventDefault();
    if (stepLock.current !== "details") return;
    const proposedTime = new Date(`${details.date}T${details.time}`).getTime();
    if (!Number.isFinite(proposedTime) || proposedTime <= Date.now()) {
      setDetailsError("Please choose a date and time in the future.");
      return;
    }
    const contact = details.contact.trim();
    if (!contact) {
      setDetailsError("Please add a contact detail, or choose to decide later.");
      return;
    }
    const responses = { ...details, contact, timezone };
    const events = Object.entries(responses).map(([stage, answer]) => makeInvitationResponse(session.current, stage, answer, followupToken));
    queue.current.push(...events);
    stepLock.current = "accepted";
    setDetails(current => ({ ...current, contact }));
    setSharedDetails(true);
    setStep("accepted");
    void flushResponses();
  }

  function decideLater() {
    if (stepLock.current !== "details") return;
    stepLock.current = "accepted";
    setStep("accepted");
  }

  function openDetails() {
    if (stepLock.current !== "accepted" || sharedDetails) return;
    stepLock.current = "details";
    setStep("details");
  }

  function changeDetail(event) {
    setDetails(current => ({ ...current, [event.target.name]: event.target.value }));
    setDetailsError("");
  }

  const declined = step === "declined";
  const deferred = step === "deferred";
  const finished = declined || deferred || step === "accepted" || step === "waiting";
  const Icon = ["waiting", "checking"].includes(step) ? Clock : ["permission", "delivery", "followup-error"].includes(step) ? Mail : step === "invitation" ? Mail : declined || deferred ? Leaf : choice === "coffee" ? Coffee : Utensils;

  return (
    <main className="invitation-page relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-[#f8f2eb] px-5 py-8 text-[#49363c] sm:px-8">
      <div aria-hidden="true" className="invitation-glow pointer-events-none absolute inset-0 -z-10" />
      <motion.div aria-hidden="true" className="pointer-events-none absolute -right-16 top-32 -z-10 h-64 w-64 rounded-full border border-[#c48a9c]/15" animate={reduceMotion ? {} : { y: [0, -12, 0], rotate: [0, 8, 0] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }} />
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between text-xs tracking-[0.15em] text-[#806a6d]">
        <span>QUESTION</span>
        <span className="hidden sm:block">A NOTE, JUST FOR YOU</span>
      </header>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-12 sm:py-16">
        <p className="mb-5 text-center text-[11px] font-medium uppercase tracking-[0.26em] text-[#8a7176]">A small question. An honest answer.</p>
        <Card className="relative overflow-hidden rounded-[2rem] border-white/80 bg-[#fffdf9]/90 shadow-[0_24px_90px_-35px_rgba(101,57,69,0.3)]">
          <div className="h-1 w-full bg-gradient-to-r from-[#e9c9ba] via-[#b96f80] to-[#e9c9ba]" />
          <CardContent className="px-7 py-10 text-center sm:px-12 sm:py-12">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={step} initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }} transition={{ duration: reduceMotion ? 0 : 0.28 }}>
                <div aria-hidden="true" className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-full border border-[#ecd9d2] bg-[#f7ece6] text-[#a65c70]">
                  <Icon size={32} strokeWidth={1.3} />
                </div>
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#a16c7b]">
                  {step === "permission" ? "Here goes nothing" : step === "invitation" ? "Okay, here’s my real question…" : declined || deferred ? "All good, truly" : "Something to look forward to"}
                </p>
                <h1 ref={focusHeading} tabIndex={-1} className="invitation-title mb-5 text-[2.35rem] leading-[1.12] tracking-[-0.035em] outline-none sm:text-[2.8rem]">
                  {step === "permission" ? <>Hey, there’s something I’ve been wanting to ask you.</> : step === "delivery" ? <>Where should I send<br />the next link?</> : step === "waiting" ? <>A little patience…</> : step === "checking" ? <>Opening your note…</> : step === "followup-error" ? <>Let’s try that link again.</> : step === "invitation" ? <>Would you like to go out for coffee or dinner with me sometime? <span className="whitespace-nowrap text-3xl">☕🍽️</span></> : declined ? <>Thank you for<br />being honest.</> : deferred ? <>Another time<br />is okay.</> : choice === "coffee" ? <>Coffee it is.</> : <>Dinner it is.</>}
                </h1>

                {step === "delivery" && <form onSubmit={submitDelivery} className="space-y-5 text-left">
                  <p className="text-center text-sm leading-7 text-[#806b70]">Thank you for saying yes. Where would you like me to send the link when the next question is ready? </p>
                  <label className="invitation-label" htmlFor="delivery-method">Send the next link via
                    <select id="delivery-method" className="invitation-input" value={delivery.method} onChange={event => setDelivery({ method: event.target.value, contact: "" })}>{["WhatsApp", "Phone", "Email", "Instagram", "Other"].map(method => <option key={method}>{method}</option>)}</select>
                  </label>
                  <label className="invitation-label" htmlFor="delivery-contact">{delivery.method === "Email" ? "Email address" : delivery.method === "Instagram" ? "Instagram username" : ["Phone", "WhatsApp"].includes(delivery.method) ? "Phone number" : "Where should I send it?"}
                    <input id="delivery-contact" className="invitation-input" type={delivery.method === "Email" ? "email" : ["Phone", "WhatsApp"].includes(delivery.method) ? "tel" : "text"} required maxLength={120} autoComplete="off" value={delivery.contact} onChange={event => setDelivery(current => ({ ...current, contact: event.target.value }))} />
                  </label>
                  <p className="text-xs leading-5 text-[#806b70]">Only the person who shared this note can see your delivery preference. They’ll send the next link personally.</p>
                  <Button type="submit" className="w-full">Save my preference <ArrowRight aria-hidden="true" /></Button>
                  <Button variant="ghost" className="w-full" onClick={() => submitDelivery(null, true)}>I’d rather not share contact details</Button>
                </form>}

                {step === "waiting" && <div className="space-y-5 text-sm leading-7 text-[#806b70]">
                  <p>You can copy your private link now. The next question will open when I’m ready to share it. There’s no need to keep this page open.</p>
                  <p>I’ll send the link personally using your preference, if you shared one. You can also save your private return link below.</p>
                  {followupToken && <><Button variant="outline" className="w-full" onClick={copyReturnLink}>{linkCopied ? "Link copied" : "Copy my link"}</Button><a className="block text-xs text-[#913d53] underline" href={`/invitation?next=${encodeURIComponent(followupToken)}`}>Open my private return link</a></>}
                </div>}
                {step === "checking" && <p role="status" className="text-sm text-[#806b70]">Checking when your next question opens…</p>}
                {step === "followup-error" && <div className="space-y-4 text-sm text-[#806b70]"><p role="alert">{error}</p><Button variant="outline" onClick={() => setStep("checking")}>Try opening again</Button></div>}

                {step === "permission" && <>
                  <p className="mb-3 text-lg text-[#925366]">Can you please say yes? </p>
                  <p className="mx-auto max-w-xs text-sm leading-7 text-[#806b70]">Just to hearing the question. Whatever your answer, there’s no pressure.</p>
                  <div className="mt-8 grid grid-cols-2 gap-3">
                    <motion.div tabIndex={-1} whileHover={reduceMotion ? {} : { y: -2 }} whileTap={reduceMotion ? {} : { scale: 0.97 }}><Button className="w-full" onClick={() => respond("permission", "yes")}>Yes</Button></motion.div>
                    <motion.div tabIndex={-1} whileHover={reduceMotion ? {} : { y: -2 }} whileTap={reduceMotion ? {} : { scale: 0.97 }}><Button variant="outline" className="w-full" onClick={() => respond("permission", "no")}>No</Button></motion.div>
                  </div>
                </>}

                {step === "invitation" && <>
                  <p className="text-sm leading-7 text-[#806b70]">A little time together, outside the everyday. Only if you’d like to.</p>
                  <div className="mt-8 grid grid-cols-2 gap-3">
                    <motion.div tabIndex={-1} whileHover={reduceMotion ? {} : { y: -3 }} whileTap={reduceMotion ? {} : { scale: 0.97 }}><Button className="h-24 w-full flex-col rounded-2xl [&_svg]:size-6" onClick={() => respond("invitation", "coffee")}><Coffee aria-hidden="true" />Coffee</Button></motion.div>
                    <motion.div tabIndex={-1} whileHover={reduceMotion ? {} : { y: -3 }} whileTap={reduceMotion ? {} : { scale: 0.97 }}><Button variant="outline" className="h-24 w-full flex-col rounded-2xl [&_svg]:size-6" onClick={() => respond("invitation", "dinner")}><Utensils aria-hidden="true" />Dinner</Button></motion.div>
                  </div>
                  <Button variant="outline" className="mt-4 w-full" onClick={() => respond("invitation", "maybe")}>😊 Maybe another time</Button>
                </>}

                {declined && <div className="space-y-4 text-sm leading-7 text-[#806b70]">
                  <p>Thank you for being honest with me. I’m sorry if I made things a little awkward. I thought maybe you felt the same way, but I guess I was wrong, and that’s completely okay.</p>
                  <p>No hard feelings at all! I really hope this doesn’t affect our work or make anything uncomfortable between us. 😊</p>
                </div>}

                {deferred && <div className="space-y-4 text-sm leading-7 text-[#806b70]">
                  <p>Of course — no pressure at all. Thank you for hearing me out. 😊</p>
                  <p>You don’t need to pick a day or explain. I’m glad I asked, and things can stay comfortable between us.</p>
                </div>}

                {step === "details" && <form onSubmit={submitDetails} className="mt-6 space-y-5 text-left">
                  <p className="text-center text-sm leading-7 text-[#806b70]">When would you like to go, and where can I contact you? Pick what works for you — we can always decide later.</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="invitation-label" htmlFor="invite-date">Preferred date
                      <input className="invitation-input" id="invite-date" name="date" type="date" min={minimumDate} required value={details.date} onChange={changeDetail} />
                    </label>
                    <label className="invitation-label" htmlFor="invite-time">Preferred time
                      <input className="invitation-input" id="invite-time" name="time" type="time" required value={details.time} onChange={changeDetail} />
                    </label>
                  </div>
                  <p className="text-xs leading-5 text-[#806b70]">Your local time zone: {timezone}. This is a suggestion; we’ll confirm together.</p>
                  <label className="invitation-label" htmlFor="invite-method">Where can I contact you?
                    <select className="invitation-input" id="invite-method" name="contact_method" value={details.contact_method} onChange={changeDetail}>
                      {["WhatsApp", "Phone", "Email", "Instagram", "Other"].map(method => <option key={method}>{method}</option>)}
                    </select>
                  </label>
                  <label className="invitation-label" htmlFor="invite-contact">{details.contact_method === "Email" ? "Email address" : details.contact_method === "Instagram" ? "Instagram username" : ["Phone", "WhatsApp"].includes(details.contact_method) ? "Phone number" : "Contact details"}
                    <input className="invitation-input" id="invite-contact" name="contact" type={details.contact_method === "Email" ? "email" : ["Phone", "WhatsApp"].includes(details.contact_method) ? "tel" : "text"} autoComplete="off" maxLength={120} required value={details.contact} onChange={changeDetail} placeholder={details.contact_method === "Instagram" ? "@yourname" : details.contact_method === "Email" ? "you@example.com" : ["Phone", "WhatsApp"].includes(details.contact_method) ? "Include your country code" : "How can I reach you?"} />
                  </label>
                  <p className="text-xs leading-5 text-[#806b70]">These details will be sent to the person who shared this note, to arrange our plans.</p>
                  {detailsError && <p role="alert" className="text-sm text-[#913d53]">{detailsError}</p>}
                  <Button type="submit" className="w-full">Send my details <ArrowRight aria-hidden="true" /></Button>
                  <Button variant="ghost" className="w-full" onClick={decideLater}>We can decide later</Button>
                </form>}

                {step === "accepted" && <div className="space-y-4 text-sm leading-7 text-[#806b70]">
                  <p>That made me smile. Thank you for saying yes.</p>
                  <p>{sharedDetails ? "Thank you for sharing what works for you. We’ll confirm the plans together." : "We can find a day and a place that feel right for both of us. No rush."}</p>
                  {sharedDetails && <div className="rounded-2xl bg-[#f8eee7] p-4 text-left text-sm">
                    <p><span className="font-medium">Suggested time:</span> {details.date} at {details.time}</p>
                    <p className="text-xs">{timezone}</p>
                    <p className="mt-3 break-words"><span className="font-medium">{details.contact_method}:</span> {details.contact}</p>
                  </div>}
                  <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full border border-[#e6d5cd] bg-[#f8eee7] px-5 py-2 text-[#925366]"><Check size={16} aria-hidden="true" />{choice === "coffee" ? "A coffee together" : "Dinner together"}</div>
                  {!sharedDetails && <div className="pt-3"><Button variant="outline" onClick={openDetails}>Suggest a time or contact (optional)</Button></div>}
                </div>}
              </motion.div>
            </AnimatePresence>
          </CardContent>
          <div className="border-t border-[#eee1da] px-6 py-4 text-center text-[11px] leading-5 text-[#8a7578]">{finished ? "Your honesty means more than a perfect answer." : "An honest no is always welcome."}</div>
        </Card>

        <div className="mt-5 text-center text-xs leading-6 text-[#806b70]" aria-live="polite" aria-atomic="true">
          {saveState === "idle" && <p>Your choices will be sent to the person who shared this note.</p>}
          {saveState === "saving" && <p className="flex items-center justify-center gap-2"><Loader2 size={13} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />Sending your answer…</p>}
          {saveState === "saved" && <p className="flex items-center justify-center gap-2"><Check size={13} aria-hidden="true" />Your answer has been sent.</p>}
          {saveState === "error" && <div role="alert" className="rounded-2xl border border-[#d9b7b6] bg-[#fff9f5] p-4"><p>{error}</p><Button size="sm" variant="outline" className="mt-3" onClick={flushResponses}>Retry sending</Button><p className="mt-2 text-[11px]">Keep this page open to retry your answer.</p></div>}
        </div>
      </div>
      <footer className="text-center text-[10px] uppercase tracking-[0.22em] text-[#9a8587]">A little courage. A lot of respect.</footer>
    </main>
  );
}
