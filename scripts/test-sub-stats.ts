import { db, pool } from "../src/db";
import { players } from "../src/db/schema";
import { createMatch } from "../src/lib/matchService";
import { calculatePlayerStats } from "../src/lib/stats";
import type { MatchInput } from "../src/lib/matchValidation";

function assert(c: boolean, m: string){ if(!c) throw new Error("FAIL: "+m); console.log("PASS: "+m); }
function wp(ids:number[],t:"A"|"B"){const p:("GK"|"DEF"|"ATT")[]=["GK","DEF","DEF","DEF","ATT","ATT","ATT"];return ids.map((id,i)=>({playerId:id,team:t,role:"starter" as const,position:p[i]??"ATT" as const,played:true}));}

async function main(){
  await pool.query("TRUNCATE TABLE goals, match_players, matches, players RESTART IDENTITY CASCADE;");
  const ins = await db.insert(players).values(Array.from({length:16},(_,i)=>({name:"P"+(i+1),playerType:"regular" as const}))).returning();
  const ids = ins.map(p=>p.id); const A=ids.slice(0,7), B=ids.slice(7,14);
  const subPlayed = ids[14];   // sub who plays for A (winning team)
  const subBenched = ids[15];  // sub who does NOT play

  const input: MatchInput = {
    matchDate:"2026-07-01", teamAScore:1, teamBScore:0,
    players:[
      ...wp(A,"A"), ...wp(B,"B"),
      {playerId:subPlayed, team:"A", role:"substitute", position:null, played:true},
      {playerId:subBenched, team:"A", role:"substitute", position:null, played:false},
    ],
    goals:[{playerId:A[4], team:"A", isOwnGoal:false}],
  };
  await createMatch(input);

  const played = await calculatePlayerStats(subPlayed);
  assert(played.matchesPlayed===1, "sub who PLAYED counts 1 match");
  assert(played.wins===1, "sub who played on winning team gets the WIN");

  const benched = await calculatePlayerStats(subBenched);
  assert(benched.matchesPlayed===0, "sub who did NOT play counts 0 matches");
  assert(benched.wins===0, "benched sub gets no win");

  console.log("\nSUB STATS OK");
}
main().then(()=>pool.end()).catch(e=>{console.error(e);pool.end();process.exit(1);});
