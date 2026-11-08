export class WorldClockEngine {
 constructor(rules){this.rules=rules;this.minute=Date.parse(rules.start+'Z')/60000;this.speed=1;this.paused=true;this.accumulator=0;}
 get iso(){return new Date(this.minute*60000).toISOString().slice(0,16);}
 setSpeed(speed){if(!this.rules.speedOptions.includes(Number(speed)))throw Error('不支持的倍速');this.speed=Number(speed);}
 tick(realMs){if(this.paused)return 0;this.accumulator+=Math.max(0,realMs)*this.speed;const whole=Math.floor(this.accumulator/this.rules.realMsPerGameMinuteAt1x);this.accumulator-=whole*this.rules.realMsPerGameMinuteAt1x;return whole;}
 advance(minutes){if(!Number.isInteger(minutes)||minutes<0||minutes>10080)throw Error('无效时间增量');this.minute+=minutes;}
 restore(data){if(!Number.isFinite(data?.minute))throw Error('世界时间存档无效');this.minute=data.minute;this.speed=this.rules.speedOptions.includes(data.speed)?data.speed:1;this.paused=true;this.accumulator=0;}
 snapshot(){return {minute:this.minute,speed:this.speed,paused:true};}
}
