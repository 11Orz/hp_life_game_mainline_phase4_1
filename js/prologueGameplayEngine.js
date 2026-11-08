export class PrologueGameplayEngine {
 constructor(config){this.config=config;this.items=Object.fromEntries(config.items.map(x=>[x.id,x]));}
 initialize(state){if(state.gameplay)return state.gameplay;const starting=this.config.startingGalleons[state.background]??95;state.gameplay={version:1,galleons:starting,initialGalleons:starting,inventory:[],transactions:[],wand:null,pet:null,relationships:{},memories:[],flags:{},initialized:true};return state.gameplay;}
 buy(state,itemId,source,priceOverride=null){const g=this.initialize(state),item=this.items[itemId];if(!item)throw Error('未知物品：'+itemId);if(g.inventory.some(x=>x.id===itemId))return false;const price=priceOverride??item.price;if(g.galleons<price){this.remember(state,'budget_shortage','预算不足，家人替你协调了必要的入学用品。',source);g.galleons=price;g.flags.familySupport=true;}g.galleons-=price;g.inventory.push({id:item.id,name:item.name,price,acquiredAt:source});g.transactions.push({itemId,price,date:source});return true;}
 remember(state,id,text,date='1991-08-01'){const g=this.initialize(state);if(g.memories.some(x=>x.id===id))return;g.memories.push({id,text,date});}
 meet(state,id,change,detail,date){const g=this.initialize(state);const old=g.relationships[id]||{trust:0,meetings:0,memories:[]};old.trust=Math.max(-100,Math.min(100,old.trust+change));old.meetings++;old.memories.push({date,detail});g.relationships[id]=old;this.remember(state,'meet_'+id,detail,date);}
 afterEvent(state,event){const g=this.initialize(state);if(g.flags[event.id])return;g.flags[event.id]=true;if(event.id==='prologue_10')this.buy(state,'school_trunk',event.date);if(event.id==='prologue_11')this.remember(state,'family_support',`${state.background==='guardian'?'监护人':'家人'}答应支持你完成入学准备。`,event.date);}
 afterChoice(state,event,choice){const g=this.initialize(state),id=choice.id,date=event.date;if(event.id==='prologue_04')this.remember(state,'letter_response',choice.label,date);
 if(event.id==='prologue_09')this.remember(state,'family_decision',choice.label,date);
 if(event.id==='prologue_14')this.remember(state,'goblin_etiquette',choice.label,date);
 if(event.id==='prologue_15'){const used=id==='shopping_used';this.buy(state,used?'used_robes':'school_robes',date);this.buy(state,used?'used_books':'school_books',date);g.flags.shoppingStyle=id;}
 if(event.id==='prologue_16'){this.buy(state,'wand',date);const ix=id==='choice_15_0'?1:id==='choice_15_1'?0:2;g.wand={...this.config.wandProfiles[ix],acquiredAt:date};state.wand=`${g.wand.wood} · ${g.wand.core} · ${g.wand.length}`;this.remember(state,'wand_chosen',`奥利凡德为你找到了${state.wand}的魔杖。`,date);}
 if(event.id==='prologue_17'){const pet=choice.effects.pet;g.pet=pet;if(pet&&pet!=='none')this.buy(state,pet,date);this.remember(state,'pet_choice',choice.label,date);}
 if(event.id==='prologue_19'){if(id==='extra_spellbook')this.buy(state,'spellbook',date);if(id==='extra_stationery')this.buy(state,'stationery',date);}
 if(event.id==='prologue_21')this.remember(state,'future_letter',choice.label,date);
 if(event.id==='prologue_25'){if(id!=='choice_24_2')this.meet(state,'train_classmate_1991',id==='choice_24_0'?18:10,choice.result,date);else this.remember(state,'train_solitude',choice.result,date);}
 }
 summary(state){const g=this.initialize(state);return {galleons:g.galleons,inventory:g.inventory,wand:g.wand,pet:g.pet,relationships:g.relationships,memories:g.memories,transactions:g.transactions};}
}
