import {CanonGuard} from './story/canonGuard.js';
import {addDays,inRange,yearArc,chapterWindow} from './story/storyScheduler.js';
const uniquePush=(arr,value)=>{if(!arr.includes(value))arr.push(value);};
export class HistoricalStoryEngine {
 constructor(data,school){
  this.data=data;this.school=school;
  this.arcs=data.historical_story_arcs.arcs;
  this.events=data.historical_story_events.events;
  this.bosses=data.boss_encounters.bosses;
  this.clues=data.mystery_clues.clues;
  this.guard=new CanonGuard(this.arcs);
  this.eventsById=new Map(this.events.map(e=>[e.id,e]));
  this.validate();this.ensureState();
 }
 validate(){
  const ids=new Set();for(const e of this.events){if(ids.has(e.id))throw Error(`重复历史事件：${e.id}`);ids.add(e.id);}
  for(const a of this.arcs)for(const c of a.chapters)for(const id of c.eventIds)if(!ids.has(id))throw Error(`章节引用不存在：${id}`);
 }
 get player(){return this.school.player;}
 ensureState(){const p=this.player;if(!p)return null;
  p.historicalStory??={version:1,completedEvents:[],missedEvents:[],completedChapters:[],completedBosses:[],clues:[],choiceHistory:[],historyNews:[],pending:null};
  return p.historicalStory;
 }
 getActiveArc(){const p=this.player;return p.enrolled&&p.schoolId==='hogwarts'?yearArc(this.arcs,p.date):null;}
 getCurrentChapter(){const a=this.getActiveArc();if(!a)return null;
  const s=this.ensureState();return a.chapters.find(c=>!s.completedChapters.includes(c.id)&&chapterWindow(a,c).end>=this.player.date)||null;
 }
 checkRequirements(req={}){return this.school.check(req);}
 getAvailableStoryEvents(){const a=this.getActiveArc(),s=this.ensureState(),p=this.player;if(!a||s.pending)return [];
  const c=this.getCurrentChapter();if(!c)return [];
  const w=chapterWindow(a,c);if(!inRange(p.date,w.start,w.end))return [];
  return c.eventIds.map(id=>this.eventsById.get(id)).filter(e=>e&&inRange(p.date,e.scope.startDate,e.scope.endDate)&&!s.completedEvents.includes(e.id)&&!s.missedEvents.includes(e.id)&&p.schoolYear>=e.scope.schoolYearRange[0]&&p.schoolYear<=e.scope.schoolYearRange[1]);
 }
 getHistoricalNews(){const a=this.getActiveArc();return a?{title:a.title,description:a.premise,canon:this.guard.historicalStatus(a)}:null;}
 refresh(){const s=this.ensureState(),a=this.getActiveArc();if(!a)return;
  for(const c of a.chapters){const w=chapterWindow(a,c);
   if(this.player.date>w.end){for(const id of c.eventIds)if(!s.completedEvents.includes(id))uniquePush(s.missedEvents,id);}
   if(c.eventIds.every(id=>s.completedEvents.includes(id)||s.missedEvents.includes(id)))uniquePush(s.completedChapters,c.id);
  }
  const boss=this.bosses.find(b=>b.arcId===a.id);
  if(boss&&this.player.date>boss.trigger.window.end&&!s.completedBosses.includes(boss.id)){
    uniquePush(s.completedBosses,boss.id);this.record(`${boss.title}：你未直接参与，历史仍按正史发生。`,'历史纪事');
  }
 }
 getBossCandidate(){const a=this.getActiveArc(),s=this.ensureState();if(!a)return null;
  const b=this.bosses.find(x=>x.arcId===a.id);if(!b||s.completedBosses.includes(b.id))return null;
  const {start,end}=b.trigger.window;if(!inRange(this.player.date,start,end))return null;
  if(!s.completedChapters.includes(b.trigger.afterChapterId))return null;
  return b;
 }
 schedule(){const s=this.ensureState();if(s.pending)return s.pending;this.refresh();
  const boss=this.getBossCandidate();if(boss){s.pending={type:'boss',id:boss.id};return s.pending;}
  const e=this.getAvailableStoryEvents()[0];if(e){s.pending={type:'event',id:e.id};return s.pending;}
  return null;
 }
 getPending(){const s=this.ensureState(),p=s.pending;if(!p)return null;
  return p.type==='event'?{type:'event',data:this.eventsById.get(p.id)}:{type:'boss',data:this.bosses.find(b=>b.id===p.id)};
 }
 record(text,title='时代主线'){this.player.journal.unshift({date:this.player.date,title,choice:'历史剧情',result:text});}
 chooseStoryOption(choiceId){const s=this.ensureState(),pending=this.getPending();if(!pending||pending.type!=='event')throw Error('当前没有待处理的历史事件');
  const e=pending.data,choice=e.choices.find(c=>c.id===choiceId);if(!choice||!this.checkRequirements(choice.requirements))throw Error('选项尚未解锁');
  const outcome=choice.outcomes?.[0]||{};this.guard.validatePlayerEffects(outcome.effects);
  this.school.applyEffects(outcome.effects||{});
  s.completedEvents.push(e.id);s.choiceHistory.push({date:this.player.date,eventId:e.id,choiceId});
  for(const clue of this.clues.filter(c=>c.arcId===e.arcId&&c.introducedInChapterId===e.chapterId)){
   if((clue.discovery?.requiresAny||[]).includes(choiceId))uniquePush(s.clues,clue.id);
  }
  const result=outcome.text||'你完成了这次行动。';this.record(`${e.title} · ${choice.label}：${result}`);
  s.pending=null;this.refresh();return result;
 }
 resolveBoss(actionId){const s=this.ensureState(),pending=this.getPending();if(!pending||pending.type!=='boss')throw Error('当前没有Boss危机');
  const boss=pending.data,actions=['defend','rescue','retreat'];if(!actions.includes(actionId))throw Error('未知行动');
  const effects=actionId==='defend'?{schoolReputation:5,stress:7,skillXp:{defense:3}}:actionId==='rescue'?{teacherTrust:4,stress:5,relationshipDelta:{targetNpc:5}}:{stress:2};
  this.guard.validatePlayerEffects(effects);this.school.applyEffects(effects);
  uniquePush(s.completedBosses,boss.id);s.pending=null;
  const result=`${boss.title}：${{defend:'你参与了外围防御',rescue:'你优先保护并疏散同伴',retreat:'你选择安全撤离'}[actionId]}。正史结果：${boss.canonicalOutcome}`;
  this.record(result,'学年重大危机');return result;
 }
 advance(days=1){if(this.school.pending||this.ensureState().pending)throw Error('请先处理当前事件');let advanced=0;
  for(let i=0;i<days;i++){
   this.player.date=addDays(this.player.date,1);this.player.daysPlayed=(this.player.daysPlayed||0)+1;advanced++;
   this.refresh();if(this.schedule())break;
   // 只在历史事件未占用时调度校园日常事件
   if(this.school.nextEvent())break;
  }
  return {advanced,storyPending:!!this.ensureState().pending,schoolPending:!!this.school.pending};
 }
 getSummary(){const a=this.getActiveArc(),c=this.getCurrentChapter(),s=this.ensureState();
  return {arc:a,chapter:c,completed:s.completedEvents.length,missed:s.missedEvents.length,clues:s.clues.length,bosses:s.completedBosses.length,available:this.getAvailableStoryEvents().length};
 }
}
