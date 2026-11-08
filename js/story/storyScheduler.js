// 历史剧情与校园日常共享日期，历史剧情先检查，绝不重复推进时钟。
export const dateUTC = s => new Date(`${s}T12:00:00Z`);
export const addDays = (s,n=1) => {const d=dateUTC(s);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
export const inRange = (date,start,end)=>date>=start&&date<=end;
export const yearArc = (arcs,date)=>arcs.find(a=>inRange(date,`${a.yearStart}-09-01`,`${a.yearEnd}-08-31`))||null;
export function monthInWindow(month,from,to){return from<=to?month>=from&&month<=to:month>=from||month<=to;}
export function chapterWindow(arc,chapter){
 const {fromMonth,toMonth}=chapter.window;
 const startYear=fromMonth>=9?arc.yearStart:arc.yearEnd;
 const endYear=toMonth>=9?arc.yearStart:arc.yearEnd;
 const lastDay=new Date(Date.UTC(endYear,toMonth,0)).getUTCDate();
 return {start:`${startYear}-${String(fromMonth).padStart(2,'0')}-01`,end:`${endYear}-${String(toMonth).padStart(2,'0')}-${lastDay}`};
}
