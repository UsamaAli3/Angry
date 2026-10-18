import { useState } from "react";
import { currentDeviceId, deviceColorIndex, readOwnedDevices, saveOwnedDevices, visitDeviceKey } from "../lib/visit-devices.js";

const colors = [
  "border-rose-300 bg-rose-50 text-rose-950",
  "border-violet-300 bg-violet-50 text-violet-950",
  "border-sky-300 bg-sky-50 text-sky-950",
  "border-emerald-300 bg-emerald-50 text-emerald-950",
  "border-amber-300 bg-amber-50 text-amber-950",
];

export default function WebsiteVisits({ visits, formatTimestamp }) {
  const [owned, setOwned] = useState(readOwnedDevices);
  const [error, setError] = useState("");
  const current = `device:${currentDeviceId()}`;
  function toggle(key) {
    const next = owned.includes(key) ? owned.filter(item => item !== key) : [...owned, key];
    try { saveOwnedDevices(next); setOwned(next); setError(""); }
    catch { setError("Your browser couldn't save this label. Please allow local storage and try again."); }
  }
  return <section className="mt-8" aria-label="Website visit records">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="font-display text-xl font-bold text-white">Website Visits</h2>
        <p className="mt-1 text-sm text-white/70">Mark your visits as “My device”. Other devices keep consistent colors.</p>
        <p className="mt-1 text-xs text-white/60">Labels are saved in this browser. Older visits without a device ID are labeled individually.</p></div>
      <button type="button" aria-pressed={owned.includes(current)} onClick={() => toggle(current)} className="rounded-2xl border border-white/40 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
        {owned.includes(current) ? "Unmark this browser" : "Mark this browser as mine"}
      </button>
    </div>
    {error && <p role="alert" className="mb-4 rounded-xl bg-rose-100 p-3 text-rose-950">{error}</p>}
    {!visits.length ? <p className="text-sm text-mist">No visit details yet.</p> : <ul className="space-y-3">
      {visits.map(visit => {
        const key = visitDeviceKey(visit), mine = owned.includes(key), thisBrowser = key === current;
        return <li key={visit.$id} data-visit-device={key} className={`rounded-3xl border-l-4 p-5 text-sm shadow-soft ${mine ? "border-slate-400 bg-slate-100 text-slate-900" : colors[deviceColorIndex(key)]}`}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-current px-2.5 py-1 text-xs font-bold">{mine ? "My device" : "Visitor"}</span>
              {thisBrowser && <span className="text-xs font-medium">This browser</span>}
              {!key.startsWith("device:") && <span className="text-xs">Older visit · device unknown</span>}
            </div>
            <button type="button" aria-pressed={mine} onClick={() => toggle(key)} className="rounded-xl border border-current px-3 py-2 font-semibold hover:bg-white/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current">{mine ? "Unmark as mine" : "Mark as mine"}</button>
          </div>
          <p className="mb-3 font-semibold">{formatTimestamp(visit.created_at || visit.$createdAt)}</p>
          {[["Device", visit.device_info], ["Platform", visit.platform], ["Language", visit.language], ["Timezone", visit.timezone], ["Screen", visit.screen_size], ["Location", visit.location_info], ["Referrer", visit.referrer]].map(([label, value]) => <p key={label} className="mb-1 break-words"><span className="font-semibold">{label}: </span><span>{value || "Unknown"}</span></p>)}
        </li>;
      })}
    </ul>}
  </section>;
}
