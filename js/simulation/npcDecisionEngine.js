export function decideActivity(npc,needs,rules,minute,memoryBias=()=>0){
 const scores=rules.activities.map(a=>{let score=a.base+(rules.traitBonuses[npc.trait]?.[a.id]||0)+memoryBias(a.id);if(a.id==='rest')score+=Math.max(0,80-needs.energy);if(a.id==='chat')score+=Math.max(0,70-needs.social);if(a.id==='study')score+=Math.max(0,70-needs.preparedness)/2;return {...a,score};});
 scores.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));return scores[0];
}
