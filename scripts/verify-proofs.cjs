const fs=require('node:fs'),path=require('node:path');
const {root,assert,equal,digest,rpc,read,receiptSummary,save}=require('./transport.cjs');
const {decodeReceipt}=require('./receipt-calldata.cjs');
const {cases,reports,projects,initial,replay,plan,result}=require('./proof-checks.cjs');
const load=n=>JSON.parse(fs.readFileSync(path.join(root,'proofs',n+'.json')));
async function main(){
 const offline=process.argv.includes('--offline'),suite=load('suite'),code=fs.readFileSync(path.join(root,'contracts/equal_purse.py')),journal=load('transactions');
 const revision=fs.readFileSync(path.join(root,'config/fixture-revision.txt'),'utf8').trim();
 assert(suite.length===cases.length&&journal.source_sha256===digest(code),'Complete source-bound suite');
 if(!offline)assert(await rpc('eth_chainId',[])==='0xf22f','StudioNet chain');
 const hashes=new Set(),summary={mode:offline?'offline-artifact':'fresh-rpc-and-state',verified_at:new Date().toISOString(),source_sha256:digest(code),instances:[],transactions:[]};
 async function verify(label,hash,success,caller,d,expected){
  assert(!hashes.has(hash)&&journal.hashes[label]===hash,'Unique journal-bound receipt');hashes.add(hash);
  const saved=load(label+'-receipt'),r=offline?saved:await rpc('eth_getTransactionByHash',[hash]),s=receiptSummary(r);
  assert(s.hash===hash&&s.status==='FINALIZED'&&s.result==='MAJORITY_AGREE'&&s.agree>(s.agree+s.disagree+s.idle)/2,'Finalized strict majority');
  assert((r.to_address||r.recipient).toLowerCase()===d.contract.toLowerCase()&&(r.from_address||r.sender).toLowerCase()===d.callers[caller],'Actual target and authorized signer');
  assert(equal(saved.consensus_data.votes,r.consensus_data.votes)&&equal(saved.data,r.data)&&equal(await decodeReceipt(r),expected),'Actual calldata and raw votes');
  assert(success?['SUCCESS','FINISHED_WITH_RETURN'].includes(s.execution):s.execution==='ERROR','Execution result');
  if(label.endsWith('-deployment'))assert(code.equals(Buffer.from(r.data.contract_code,'base64')),'Receipt deployment source');
  summary.transactions.push({label,...s});
 }
 for(let i=0;i<cases.length;i++){
  const c=cases[i],d=suite[i];assert(equal(d,load(c.id+'-deployment'))&&d.id===c.id&&d.network==='studionet'&&d.chain_id===61999&&d.source_sha256===digest(code),'Deployment identity');
  assert(d.fixture_revision===revision&&equal(d.reports,reports(c,revision))&&d.callers.length===6&&new Set(d.callers).size===6,'Pinned fixtures and distinct voters');
  const args=['gabrieladash123-bit/equal-purse',c.voters,d.callers.slice(0,c.voters.length),c.projects,projects(c).map(p=>p.meaning),c.seats];
  assert(equal(d.args,args),'Exact constructor roster and project meanings');
  await verify(c.id+'-deployment',d.transaction,true,0,d,{args});
  let previous=load(c.id+'-initial-state');assert(equal(previous,initial(c,d)),'Exact initial election');
  const items=plan(c,d),trace=load(c.id+'-trace');assert(trace.length===items.length,'Complete planned operations');
  for(let j=0;j<items.length;j++){
   const item=items[j],p=trace[j];assert(equal(p,load(item.label))&&Object.keys(item).every(k=>equal(p[k],item[k]))&&p.contract===d.contract&&p.sender===d.callers[item.caller]&&equal(p.state_before,previous),'Source-bound trace chain');
   await verify(item.label,p.transaction,!item.error,item.caller,d,{method:item.method,args:item.args});
   replay(previous,item,p.state,c,d);
   if(item.error)assert(JSON.stringify(load(item.label+'-decoded-receipt')).includes(item.error),'Exact expected failure');
   previous=p.state;
  }
  assert(previous.closed&&equal(previous.result,result(c))&&equal(previous,load(c.id+'-final-state')),'Final exact-rational committee and remaining balances');
  if(!offline){assert(code.equals(Buffer.from(await rpc('gen_getContractCode',[d.contract]),'base64')),'Live deployed source');assert(equal(previous,await read(c.id+'-fresh-final',['call',d.contract,'get_state'])),'Fresh election state');}
  summary.instances.push({id:c.id,contract:d.contract,status:previous.result.status,winners:previous.result.winners});
 }
 assert(hashes.size===23&&Object.keys(journal.hashes).length===23,'Exactly 23 distinct proof receipts');summary.transaction_calldata_checked=true;
 if(!offline){summary.live_state_match=true;save('verification',summary);}console.log(JSON.stringify(summary,null,2));
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
