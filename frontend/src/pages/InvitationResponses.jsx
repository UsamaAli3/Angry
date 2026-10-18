import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getInvitationResponses } from "../data/invitations.js";
import { Button } from "../components/ui/button.jsx";

const labels = { yes: "Yes, ask me", no: "No, thank you", coffee: "Coffee", dinner: "Dinner", maybe: "Maybe another time" };
const stageLabels = { permission: "May I ask?", invitation: "Coffee or dinner?", date: "Preferred date", time: "Preferred time", timezone: "Time zone", contact_method: "Contact via", contact: "Contact details", delivery_method: "Next link via", delivery_contact: "Next link contact", next_link: "Private next link token", link_access: "Owner link approval" };

export default function InvitationResponses() {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try { setResponses(await getInvitationResponses()); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  return <main className="mx-auto max-w-3xl px-5 py-10 text-white">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="font-display text-3xl font-bold">Question responses</h1><p className="mt-2 text-sm text-white/60">The latest 100 choices. Matching reference codes belong to the same invitation session.</p></div>
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline" className="text-white hover:text-ink"><Link to="/records?tab=invitations">View in My Records</Link></Button>
        <Button asChild><Link to="/invitation">Open invitation</Link></Button>
        <Button variant="outline" className="text-white hover:text-ink" onClick={load} disabled={loading}>Refresh</Button>
      </div>
    </div>
    {loading ? <p role="status">Loading responses…</p> : error ? <p role="alert" className="rounded-xl bg-bloom/10 p-4 text-bloom">{error}</p> : !responses.length ? <p>No responses yet.</p> :
      <div className="overflow-x-auto rounded-2xl border border-white/15"><table className="w-full text-left text-sm">
        <caption className="sr-only">Saved invitation responses</caption>
        <thead className="bg-white/10"><tr>{["Reference", "Question", "Answer", "Time"].map(label => <th key={label} scope="col" className="p-4 font-medium">{label}</th>)}</tr></thead>
        <tbody>{responses.map(response => <tr key={response.$id} className="border-t border-white/10">
          <td className="p-4 font-mono text-xs" title={response.session_id}>{response.session_id}</td>
          <td className="p-4">{stageLabels[response.stage] ?? response.stage}</td>
          <td className="break-words p-4">{["permission", "invitation"].includes(response.stage) ? labels[response.answer] ?? response.answer : response.answer}</td>
          <td className="whitespace-nowrap p-4 text-white/60">{new Date(response.created_at).toLocaleString()}</td>
        </tr>)}</tbody>
      </table></div>}
  </main>;
}
