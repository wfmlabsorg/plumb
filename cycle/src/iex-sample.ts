/** A synthetic export in the IEX style (its own column names, mm:ss, %, US dates) — to prove the mapping round-trips. */
import type { ExtractRow } from "./world";
const mmss = (s: number) => `${Math.floor(Math.round(s) / 60)}:${String(Math.round(s) % 60).padStart(2, "0")}`;
const mdy = (d: string) => `${+d.slice(5, 7)}/${+d.slice(8, 10)}/${d.slice(0, 4)}`;
export function iexStyleExport(rows: ExtractRow[]): string {
  const head = ["Date", "CT", "Queue Type", "Fcst Contacts", "Act Contacts", "Fcst AHT", "Act AHT", "Fcst Req", "Sched Open", "Act Req", "Act Open", "Offered", "Handled", "Ans in SL", "Abandoned", "SL %", "ASA"];
  return [head.join(","), ...rows.map((r) => [mdy(r.date), r.gate, r.channel.toUpperCase(), r.fc_volume, r.act_volume, mmss(r.fc_aht_sec), mmss(r.act_aht_sec), r.fc_req_fte, r.sched_open_fte, r.act_req_fte, r.act_fte, r.offered, r.handled, r.answered_in_sl, r.abandoned, `${(r.sl * 100).toFixed(1)}%`, r.asa_sec === null ? "" : mmss(r.asa_sec)].join(","))].join("\n") + "\n";
}
