// Deterministic, lightweight social simulation. No external services.
const clamp=(v,a=-100,b=100)=>Math.max(a,Math.min(b,v));
const hash=(...parts)=>{let h=2166136261;for(const c of parts.join('|'))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0};
export class NPCSocialEngine {
 constructor(rules,networkRules={}){this.rules=rules;this.networkRules=networkRules;this.memoryRules=networkRules.memoryDecision||{};this.state={relationships:{},memories:[],cooldowns:{},invitations:[],lastProcessed:-1,invitationCooldowns:{},groups:{}};}
 key(a,b){return [a,b].sort().join('::')}
 relation(a,b){return this.state.relationships[this.key(a,b)]||0}
 addRelation(a,b,d){const k=this.key(a,b);this.state.relationships[k]=clamp(this.relation(a,b)+d)}
 record(item){const event={...item,id:item.id||`social-${item.minute}-${item.actors.join('-')}-${item.kind}`,salience:Math.abs(item.delta||0)+((item.kind==='disagree'||item.kind==='help')?8:2)};if(this.state.memories.some(e=>e.id===event.id))return;this.state.memories.unshift(event);this.state.memories=this.state.memories.slice(0,this.networkRules.memoryLimit||400)}
 memoriesFor(id,limit=12,nowMinute=null){return this.state.memories.filter(e=>e.actors?.includes(id)).map(e=>({...e,currentSalience:Math.max(0,(e.salience||1)-(nowMinute==null?0:Math.max(0,nowMinute-e.minute)/1440*(this.networkRules.memoryDecayPerDay||0.35)))})).sort((a,b)=>b.currentSalience-a.currentSalience||b.minute-a.minute).slice(0,limit)}
 // Convert remembered experiences into bounded, time-decaying decisions.
 memoryInfluence(actor,target,now){
  const cfg=this.memoryRules, halfLife=Math.max(1,cfg.halfLifeDays||21);
  const cap=Math.max(1,cfg.maxPairBias||24);
  let sum=0;
  for(const e of this.state.memories){
   if(!e.actors?.includes(actor)||!e.actors?.includes(target))continue;
   if(!Number.isFinite(e.minute)||e.minute>now)continue;
   const age=Math.max(0,now-e.minute)/1440;
   const weight=Math.pow(0.5,age/halfLife);
   const base=(cfg.kindWeights||{})[e.kind];
   const val=Number.isFinite(base)?base:Math.max(-8,Math.min(8,Number(e.delta)||0));
   sum+=val*weight;
  }
  return clamp(Math.round(sum),-cap,cap);
 }
 // Memories alter the next activity, not only the relationship score.
 activityBias(npcId,activityId,now){
  const kinds=this.memoryRules.activityEffects||{};let sum=0;
  for(const e of this.memoriesFor(npcId,20,now)){
   const impact=kinds[e.kind]?.[activityId]||0;
   const factor=Math.min(1,(e.currentSalience||0)/12);
   sum+=impact*factor;
  }
  return clamp(Math.round(sum),-18,18);
 }
 networkFor(id){const people=new Set();for(const k of Object.keys(this.state.relationships)){const [a,b]=k.split('::');if(a===id)people.add(b);if(b===id)people.add(a)}return [...people].map(other=>({id:other,relation:this.relation(id,other)})).sort((a,b)=>b.relation-a.relation)}
 groups(){const threshold=this.networkRules.groupThreshold||18;return (this.networkRules.groups||[]).map(g=>{const members=g.members||[];const edges=[];for(let i=0;i<members.length;i++)for(let j=i+1;j<members.length;j++){const strength=this.relation(members[i],members[j]);if(strength>=threshold)edges.push({a:members[i],b:members[j],strength})}return {id:g.id,name:g.name,members,edges}})}
 tick(world){const m=world.clock.minute,step=this.rules.intervalMinutes,slot=Math.floor(m/step);if(slot<=this.state.lastProcessed)return;this.state.lastProcessed=slot;
 const people=world.db.profiles.items;const occupied=new Set();
 for(const a of people){if(occupied.has(a.id))continue;const na=world.npcs[a.id];if(!na||!this.rules.allowedActivities.includes(na.slot))continue;
 const candidates=people.filter(b=>b.id!==a.id&&!occupied.has(b.id)&&world.npcs[b.id]?.location===na.location&&world.npcs[b.id]?.slot===na.slot&&(!this.state.cooldowns[this.key(a.id,b.id)]||m>=this.state.cooldowns[this.key(a.id,b.id)]));
 if(!candidates.length)continue;
 const sorted=candidates.map(b=>({b,score:this.relation(a.id,b.id)+this.memoryInfluence(a.id,b.id,m)+ (a.trait===b.trait?12:0)+ (a.house===b.house?7:0)+(hash(slot,a.id,b.id)%30)})).sort((x,y)=>y.score-x.score);
 if(hash(slot,a.id,'social')%100>=this.rules.interactionChancePercent)continue;
 const b=sorted[0].b;occupied.add(a.id);occupied.add(b.id);const kind=this.chooseKind(a,b,slot,m);const delta={chat:3,study:4,help:6,disagree:-5}[kind];this.addRelation(a.id,b.id,delta);
 const phrases={chat:`${a.name}与${b.name}聊起了今天的生活。`,study:`${a.name}和${b.name}一起讨论功课。`,help:`${a.name}帮助${b.name}解决了一件小事。`,disagree:`${a.name}和${b.name}发生了争执。`};
 const event={time:world.clock.iso,minute:m,actors:[a.id,b.id],location:na.location,kind,delta,text:phrases[kind]};this.record(event);this.state.cooldowns[this.key(a.id,b.id)]=m+this.rules.pairCooldownMinutes;
 world.npcs[a.id].needs.social=clamp((world.npcs[a.id].needs.social||50)+5,0,100);world.npcs[b.id].needs.social=clamp((world.npcs[b.id].needs.social||50)+5,0,100);
 if(world.player.location===na.location)world.emit(event.text);else if(this.rules.offscreenSummary&&hash(slot,a.id,b.id,'rumor')%100<20)world.emit(`你后来听说：${event.text}`);
 if(na.location===world.player.location&&hash(slot,a.id,b.id,'invite')%100<this.rules.invitationChancePercent){this.invite(world,a,slot)}
 }
 }
 chooseKind(a,b,slot,now){const r=hash(slot,a.id,b.id,'kind')%100;const rel=this.relation(a.id,b.id)+this.memoryInfluence(a.id,b.id,now);if(rel< -15&&r<50)return 'disagree';if(a.trait==='studious'||b.trait==='studious')return r<55?'study':'chat';return r<12?'disagree':r<30?'help':'chat'}
 invite(world,a,slot){if(world.pending||this.state.invitations.some(i=>i.status==='pending'))return;const now=world.clock.minute;if((this.state.invitationCooldowns[a.id]||0)>now)return;const candidates=(this.networkRules.eventTemplates||[]).filter(t=>this.relationToPlayer(world,a.id)+this.memoryInfluence(a.id,'player',now)>=t.minRelation&&(!t.traits||t.traits.includes(a.trait)));if(!candidates.length)return;const template=candidates[hash(slot,a.id,'template')%candidates.length];const invitation={id:`${slot}-${a.id}-${template.id}`,from:a.id,time:world.clock.iso,minute:now,status:'pending',templateId:template.id,text:`${a.name}邀请你${template.label}。`};this.state.invitations.unshift(invitation);this.state.invitationCooldowns[a.id]=now+(this.networkRules.invitationCooldownMinutes||360);world.pending={type:'invitation',invitationId:invitation.id};world.clock.paused=true;world.emit(invitation.text)}
 relationToPlayer(world,id){return Number(world.player.relationships[id]||0)}
 respond(world,choice){const pending=world.pending;if(pending?.type!=='invitation')throw Error('没有待处理的邀请');const invitation=this.state.invitations.find(x=>x.id===pending.invitationId);if(!invitation||invitation.status!=='pending')throw Error('邀请不存在或已处理');const p=world.db.profiles.items.find(x=>x.id===invitation.from);if(!p)throw Error('NPC不存在');const template=(this.networkRules.eventTemplates||[]).find(t=>t.id===invitation.templateId)||{durationMinutes:10,acceptDelta:5,declineDelta:-1};const accepted=choice==='accept';invitation.status=accepted?'accepted':'declined';const delta=accepted?template.acceptDelta:template.declineDelta;world.player.relationships[p.id]=clamp((world.player.relationships[p.id]||0)+delta);const text=accepted?`你接受了${p.name}的邀请：${template.label||'聊天'}。`:`你婉拒了${p.name}的邀请。`;world.emit(text);this.record({time:world.clock.iso,minute:world.clock.minute,actors:[p.id,'player'],location:world.player.location,kind:accepted?'accepted_invitation':'declined_invitation',delta,text});world.pending=null;if(accepted)world.advance(template.durationMinutes||10)}
 snapshot(){return structuredClone(this.state)}
 restore(s){if(!s||typeof s!=='object')return;this.state={relationships:s.relationships||{},memories:Array.isArray(s.memories)?s.memories.slice(0,this.networkRules.memoryLimit||400):[],cooldowns:s.cooldowns||{},invitations:Array.isArray(s.invitations)?s.invitations:[],lastProcessed:Number.isInteger(s.lastProcessed)?s.lastProcessed:-1,invitationCooldowns:s.invitationCooldowns||{},groups:s.groups||{}}}
}
