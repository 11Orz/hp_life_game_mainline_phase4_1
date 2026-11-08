export class SortingHatEngine {
 constructor(data,rules={}){this.questions=data.items;this.rules=rules;this.houses=['gryffindor','slytherin','ravenclaw','hufflepuff'];}
 evaluate(answers,preference=null,history=[]){const quiz=Object.fromEntries(this.houses.map(h=>[h,0]));for(const [i,id] of Object.entries(answers)){const opt=this.questions[Number(i)]?.options.find(o=>o.id===id);if(opt)quiz[opt.house]+=2;}
 const behavior=Object.fromEntries(this.houses.map(h=>[h,0]));for(const item of history){const key=item.choice||item.id;for(const [h,n] of Object.entries(this.rules.choiceWeights?.[key]||{}))if(h in behavior)behavior[h]+=n;}
 const qmax=Math.max(1,...Object.values(quiz)),bmax=Math.max(1,...Object.values(behavior));const scores=Object.fromEntries(this.houses.map(h=>[h,0]));for(const h of this.houses)scores[h]=Number((70*quiz[h]/qmax+20*behavior[h]/bmax+(preference===h?10:0)).toFixed(2));const top=Math.max(...Object.values(scores));const tied=this.houses.filter(h=>scores[h]===top);return {house:preference&&tied.includes(preference)?preference:tied[0],scores,tied,quiz,behavior,preference};}
}
