const fs=require('node:fs'),path=require('node:path');
const {root,assert,equal,digest}=require('./transport.cjs');
const cases=JSON.parse(fs.readFileSync(path.join(root,'config/scenarios.json')));
function reports(c,revision){return c.voters.map(v=>{const bytes=fs.readFileSync(path.join(root,'ballots',`${c.id}-${v}.json`));return {voter:v,url:`https://raw.githubusercontent.com/gabrieladash123-bit/equal-purse/${revision}/ballots/${c.id}-${v}.json`,sha256:digest(bytes),source:JSON.parse(bytes)};});}
const projects=c=>c.projects.map(id=>({id,meaning:`Select the ${id} project for the committee.`}));
function initial(c,d){return {repository:'gabrieladash123-bit/equal-purse',voters:c.voters.map((id,i)=>({id,wallet:d.callers[i]})),projects:projects(c),seats:c.seats,closed:false,ballots:[],result:{}};}
function checkBallot(row,c,index,d){
 const report=d.reports[index];
 assert(equal(Object.keys(row).sort(),['choices','sha256','source','url','voter']),'Exact ballot shape');
 assert(row.voter===report.voter&&row.url===report.url&&row.sha256===report.sha256&&equal(row.source,report.source),'Source-bound authorized ballot');
 assert(Array.isArray(row.choices)&&row.choices.length===c.projects.length,'Complete choices');
 row.choices.forEach((x,j)=>{
  assert(equal(Object.keys(x).sort(),['anchors','project','vote'])&&x.project===c.projects[j]&&x.vote===c.votes[index][j],'Exact independently expected approval decision');
  assert(Array.isArray(x.anchors)&&x.anchors.length>=1&&x.anchors.length<=3&&x.anchors.every(a=>Number.isInteger(a)&&a>=0&&a<row.source.statements.length)&&equal(x.anchors,[...new Set(x.anchors)].sort((a,b)=>a-b)),'Resolvable source statement anchors');
 });
}
// Independent oracle: enumerate all saturated payer subsets to find each cap.
function gcd(a,b){while(b){[a,b]=[b,a%b];}return a<0n?-a:a;}
function q(a,b=1n){a=BigInt(a);b=BigInt(b);assert(b!==0n,'Zero denominator');if(b<0n){a=-a;b=-b;}const g=gcd(a,b);return [a/g,b/g];}
const add=(a,b)=>q(a[0]*b[1]+b[0]*a[1],a[1]*b[1]);
const sub=(a,b)=>q(a[0]*b[1]-b[0]*a[1],a[1]*b[1]);
const cmp=(a,b)=>a[0]*b[1]<b[0]*a[1]?-1:a[0]*b[1]>b[0]*a[1]?1:0;
const out=a=>a.map(Number);
function cap(balances,supporters,cost){
 let best=null;
 for(let mask=0;mask<2**supporters.length;mask++){
  const small=supporters.filter((_,i)=>mask>>i&1),active=supporters.filter((_,i)=>!(mask>>i&1));if(!active.length)continue;
  const left=sub(q(cost),small.reduce((s,i)=>add(s,balances[i]),q(0))),rho=q(left[0],left[1]*BigInt(active.length));
  if(cmp(rho,q(0))>=0&&small.every(i=>cmp(balances[i],rho)<=0)&&active.every(i=>cmp(balances[i],rho)>=0)&&(!best||cmp(rho,best)<0))best=rho;
 }
 return best;
}
function result(c){
 let balances=c.voters.map(()=>q(c.seats)),winners=[],steps=[];
 const unknown=c.votes.flatMap((votes,i)=>votes.flatMap((v,j)=>v==='UNKNOWN'?[{voter:c.voters[i],project:c.projects[j]}]:[]));
 if(unknown.length)return {status:'REVIEW',winners,steps,remaining:balances.map(out),unknown};
 while(winners.length<c.seats){
  const affordable=[];
  c.projects.forEach((p,j)=>{if(winners.includes(p))return;const rho=cap(balances,c.voters.flatMap((_,i)=>c.votes[i][j]==='APPROVE'?[i]:[]),c.voters.length);if(rho)affordable.push({project:p,rho,index:j});});
  if(!affordable.length)break;
  const winner=[...affordable].sort((a,b)=>cmp(a.rho,b.rho)||a.index-b.index)[0];
  const payments=balances.map((b,i)=>c.votes[i][winner.index]==='APPROVE'?(cmp(b,winner.rho)<0?b:winner.rho):q(0));
  assert(cmp(payments.reduce(add,q(0)),q(c.voters.length))===0,'Exact project cost');
  balances=balances.map((b,i)=>sub(b,payments[i]));assert(balances.every(b=>cmp(b,q(0))>=0),'No negative balances');
  winners.push(winner.project);steps.push({project:winner.project,cap:out(winner.rho),affordable:affordable.map(x=>({project:x.project,cap:out(x.rho)})),payments:payments.map(out),remaining:balances.map(out)});
 }
 return {status:winners.length===c.seats?'FILLED':'UNDERFILLED',winners,steps,remaining:balances.map(out),unknown:[]};
}
function replay(before,item,after,c,d){
 const s=structuredClone(before);
 if(item.error){assert(equal(s,after),'Rejected operation changed state');return;}
 if(item.method==='cast'){
  assert(!s.closed&&!s.ballots.some(b=>b.voter===c.voters[item.caller]),'Eligible cast');
  const row=after.ballots.find(b=>b.voter===c.voters[item.caller]);checkBallot(row,c,item.caller,d);
  s.ballots.push(row);s.ballots.sort((a,b)=>c.voters.indexOf(a.voter)-c.voters.indexOf(b.voter));
 }else{
  assert(item.method==='close'&&!s.closed&&s.ballots.length===c.voters.length,'Complete election close');
  s.closed=true;s.result=result(c);assert(s.result.status===c.status&&equal(s.result.winners,c.winners),'Independent expected committee');
 }
 assert(equal(s,after),'Full source-bound equal-budget replay: '+item.label);
}
function plan(c,d){
 const items=[];
 if(c.id==='representation')items.push({label:c.id+'-early-close',method:'close',args:[],caller:0,error:'[EXPECTED] Missing ballots'});
 if(c.id==='conditional-consent')items.push({label:c.id+'-unregistered',method:'cast',args:[d.reports[0].url,d.reports[0].sha256],caller:5,error:'[EXPECTED] Voter only'});
 for(let i=0;i<c.voters.length;i++){
  items.push({label:c.id+'-cast-'+c.voters[i],method:'cast',args:[d.reports[i].url,d.reports[i].sha256],caller:i});
  if(c.id==='representation'&&i===0)items.push({label:c.id+'-duplicate',method:'cast',args:[d.reports[i].url,d.reports[i].sha256],caller:i,error:'[EXPECTED] Ballot already cast'});
 }
 items.push({label:c.id+'-close',method:'close',args:[],caller:0});
 if(c.id==='capped-payment')items.push({label:c.id+'-closed-again',method:'close',args:[],caller:0,error:'[EXPECTED] Election closed'});
 return items;
}
module.exports={cases,reports,projects,initial,checkBallot,result,replay,plan};
