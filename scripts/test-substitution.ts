import { db, pool } from "../src/db";
import { players } from "../src/db/schema";
import { createMatch, getMatchDetail } from "../src/lib/matchService";
import { calculatePlayerStats } from "../src/lib/stats";
import { validateMatchInput, type MatchInput } from "../src/lib/matchValidation";

function assert(c: boolean, m: string){ if(!c) throw new Error("FAIL: "+m); console.log("PASS: "+m); }
function wp(ids:number[],t:"A"|"B"){const p:("GK"|"DEF"|"ATT")[]=["GK","DEF","DEF","DEF","ATT","ATT","ATT"];return ids.map((id,i)=>({playerId:id,team:t,role:"starter" as const,position:p[i]??"ATT" as const,played:true}));}

async function main(){
  await pool.query("TRUNCATE TABLE goals, match_players, matches, players RESTART IDENTITY CASCADE;");
  const ins = await db.insert(players).values(Array.from({length:16},(_,i)=>({name:"P"+(i+1),playerType:"regular" as const}))).returning();
  const ids = ins.map(p=>p.id); const A=ids.slice(0,7), B=ids.slice(7,14);
  const sub = ids[14]; // A sub who replaces A starter P5 (ids A[4])

  const input: MatchInput = {
    matchDate:"2026-08-01", teamAScore:1, teamBScore:0,
    players:[
      ...wp(A,"A"), ...wp(B,"B"),
      {playerId:sub, team:"A", role:"substitute", position:null, played:true, replacedPlayerId:A[4]},
    ],
    goals:[{playerId:A[0], team:"A", isOwnGoal:false}],
  };
  const v = validateMatchInput(input);
  assert(v.ok, "match with a valid substitution passes validation");

  const matchId = await createMatch(input);
  const detail = await getMatchDetail(matchId);
  const subRow = detail!.matchPlayers.find(mp=>mp.playerId===sub);
  assert(subRow?.replacedPlayerId===A[4], "sub records who they replaced");

  // Both the replaced starter and the sub get the match + win (standard football).
  const replaced = await calculatePlayerStats(A[4]);
  const came = await calculatePlayerStats(sub);
  assert(replaced.matchesPlayed===1 && replaced.wins===1, "replaced starter still counts match+win");
  assert(came.matchesPlayed===1 && came.wins===1, "sub who came on counts match+win");

  // Rejection: sub replacing a starter from the OTHER team
  const bad: MatchInput = { ...input, matchDate:"2026-08-02",
    players:[...wp(A,"A"),...wp(B,"B"),{playerId:sub,team:"A",role:"substitute",position:null,played:true,replacedPlayerId:B[0]}] };
  assert(!validateMatchInput(bad).ok, "sub replacing an opposing-team starter is rejected");

  // Rejection: two subs replacing the same starter
  const sub2 = ids[15];
  const bad2: MatchInput = { ...input, matchDate:"2026-08-03",
    players:[...wp(A,"A"),...wp(B,"B"),
      {playerId:sub,team:"A",role:"substitute",position:null,played:true,replacedPlayerId:A[4]},
      {playerId:sub2,team:"A",role:"substitute",position:null,played:true,replacedPlayerId:A[4]}] };
  assert(!validateMatchInput(bad2).ok, "two subs replacing the same starter is rejected");

  console.log("\nSUBSTITUTION TESTS PASSED");
}
main().then(()=>pool.end()).catch(e=>{console.error(e);pool.end();process.exit(1);});
