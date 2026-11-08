import {PrologueGameplayEngine} from './prologueGameplayEngine.js';
export class LifeNarrativeEngine {
  constructor(data, saved=null, economy=null){this.data=data;this.events=data.events;this.state=saved||null;this.gameplay=economy?new PrologueGameplayEngine(economy):null;}
  start({name='新生',background='mixed',house='ravenclaw'}={}){
    if(!this.data.familyBackgrounds[background])throw Error('未知家庭背景');
    this.state={version:1,name:name.trim()||'新生',background,house,index:-1,pending:null,finished:false,stats:{happiness:75,knowledge:5,familyTrust:65,curiosity:50,magic:0,friendship:40,goblinRespect:50},pet:null,wand:'待选择',records:[],choices:[],started:true};this.gameplay?.initialize(this.state);return this.state;
  }
  get current(){return this.state?.index>=0?this.events[this.state.index]:null;}
  get date(){return this.current?.date||'1991-07-25';}
  advance(count=1){if(!this.state)throw Error('请先开始人生');if(this.state.pending)throw Error('请先作出决定');if(this.state.finished)return [];
    const added=[];for(let n=0;n<count;n++){if(this.state.index+1>=this.events.length){this.state.finished=true;break;}const e=this.events[++this.state.index];const text=e.branchText?.[this.state.background]||e.text;const r={id:e.id,date:e.date,title:e.title,text,type:'event',chapter:e.chapter};this.state.records.unshift(r);this.gameplay?.afterEvent(this.state,e);added.push(r);if(e.decision){this.state.pending=e.id;break;}if(this.state.index===this.events.length-1)this.state.finished=true;}return added;
  }
  decide(choiceId){if(!this.state?.pending)throw Error('没有待处理的决定');const e=this.current;if(e.id!==this.state.pending)throw Error('决定状态不匹配');const choice=e.decision.options.find(x=>x.id===choiceId);if(!choice)throw Error('无效选择');for(const [k,v] of Object.entries(choice.effects)){if(k==='pet')this.state.pet=v;else this.state.stats[k]=Math.max(0,Math.min(100,(this.state.stats[k]??50)+v));}this.state.choices.push({eventId:e.id,choiceId,date:e.date});this.state.records.unshift({id:e.id+':'+choiceId,date:e.date,title:'你的决定',text:choice.result,type:'choice',choice:choice.label,chapter:e.chapter});this.gameplay?.afterChoice(this.state,e,choice);this.state.pending=null;return choice;}
  nextDecision(){if(!this.state)throw Error('请先开始人生');let out=[];while(!this.state.pending&&!this.state.finished){out.push(...this.advance(1));}return out;}
  get pendingDecision(){return this.state?.pending?this.current.decision:null;}
  export(){return JSON.stringify(this.state);}
  restore(raw){const s=typeof raw==='string'?JSON.parse(raw):raw;if(s?.version!==1||!Array.isArray(s.records)||!Number.isInteger(s.index)||s.index < -1||s.index>=this.events.length||!this.data.familyBackgrounds[s.background])throw Error('序章存档格式错误');this.state=s;this.gameplay?.initialize(this.state);return s;}
}
