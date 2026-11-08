// Phase 3.5: deterministic, saveable, one-time history/life event bridge.
export class HistoryLifeEngine {
 constructor(config){this.config=config;this.fired=[];this.choices={};this.observations=[];}
 tick(world){
  if(world.pending)return;
  const now=world.clock.iso;
  for(const e of this.config.events){
   if(this.fired.includes(e.id)||now<e.at)continue;
   this.fired.push(e.id);
   // History is global, but only personally experienced events enter the life log.
   if(world.player.location!==e.location){
    this.observations.unshift({id:e.id,time:now,location:e.location,status:'missed'});
    continue;
   }
   world.emit(e.text);
   this.observations.unshift({id:e.id,time:now,location:e.location,status:'witnessed'});
   if(e.choices?.length){world.pending={type:'history_life',eventId:e.id};world.clock.paused=true;}
   break;
  }
 }
 resolve(world,choiceId){
  if(world.pending?.type!=='history_life')throw Error('没有待处理的生活事件');
  const event=this.config.events.find(e=>e.id===world.pending.eventId);
  const choice=event?.choices?.find(c=>c.id===choiceId);
  if(!choice)throw Error('无效选项');
  this.choices[event.id]=choice.id;
  world.player.memories??=[];
  if(!world.player.memories.includes(choice.memory))world.player.memories.push(choice.memory);
  world.emit(choice.text);
  world.pending=null;
 }
 snapshot(){return {version:1,fired:[...this.fired],choices:{...this.choices},observations:this.observations.slice(0,100)};}
 restore(data){if(!data)return;this.fired=Array.isArray(data.fired)?[...new Set(data.fired)]:[];this.choices=data.choices&&typeof data.choices==='object'?data.choices:{};this.observations=Array.isArray(data.observations)?data.observations.slice(0,100):[];}
}
