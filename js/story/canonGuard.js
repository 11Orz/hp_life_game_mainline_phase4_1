// 正史保护：玩家可改变个人结果，不可修改固定历史锚点。
export class CanonGuard {
  constructor(arcs){this.arcs=arcs;}
  validatePlayerEffects(effects={}){
    const forbidden=['voldemortDefeated','voldemortAlive','dumbledoreAlive','canonOutcome','canonAnchor','worldHistory'];
    for(const key of Object.keys(effects)) if(forbidden.includes(key)) throw Error(`正史模式禁止修改：${key}`);
    return true;
  }
  historicalStatus(arc){return {fixed:true,description:arc.canonAnchor?.description||'',source:arc.canonAnchor?.source?.reference||''};}
}
