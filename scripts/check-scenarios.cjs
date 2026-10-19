const {cases,result}=require('./proof-checks.cjs');
const {assert,equal}=require('./transport.cjs');
for(const c of cases){const r=result(c);assert(r.status===c.status&&equal(r.winners,c.winners),'Independent scenario oracle');
 if(c.id==='capped-payment')assert(equal(r.steps[1].cap,[7,3])&&equal(r.steps[1].payments,[[5,3],[0,1],[0,1],[7,3]]),'Exhausted supporter caps payment');
 console.log(c.id,r.status,JSON.stringify(r.winners));}
