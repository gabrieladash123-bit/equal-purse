const fs=require('node:fs'),path=require('node:path');
const {root,assert,equal,sourceHash,save,invoke,read,rpc,receipt}=require('./transport.cjs');
const {cases,reports,projects,initial,replay,plan}=require('./proof-checks.cjs');
async function main(){
 assert(await rpc('eth_chainId',[])==='0xf22f','Gasless StudioNet only');
 const accounts=JSON.parse(process.env.PURSE_ACCOUNTS||'null');assert(accounts?.length===6,'Six disposable voter wallets');
 const revision=fs.readFileSync(path.join(root,'config/fixture-revision.txt'),'utf8').trim();assert(/^[a-f0-9]{40}$/.test(revision),'Pinned fixtures');
 const suite=[];
 for(const c of cases){
  const rows=reports(c,revision);
  for(const r of rows){const response=await fetch(r.url,{signal:AbortSignal.timeout(45000)});assert(response.ok&&equal(JSON.parse(await response.text()),r.source),'Public fixture availability');}
  process.env.PURSE_ACCOUNT=accounts[0].name;
  const args=['gabrieladash123-bit/equal-purse',c.voters,accounts.slice(0,c.voters.length).map(a=>a.address),c.projects,projects(c).map(p=>p.meaning),c.seats];
  const tx=await invoke(c.id+'-deployment',['deploy','--contract','contracts/equal_purse.py','--args',...args.map(a=>typeof a==='string'?a:JSON.stringify(a))]);
  const rr=await receipt(c.id+'-deployment',tx,true),contract=rr.to_address||rr.recipient;
  assert(fs.readFileSync(path.join(root,'contracts/equal_purse.py')).equals(Buffer.from(await rpc('gen_getContractCode',[contract]),'base64')),'Exact deployed source bytes');
  const d={id:c.id,contract,transaction:tx,reports:rows,fixture_revision:revision,source_sha256:sourceHash,network:'studionet',chain_id:61999,callers:accounts.map(a=>a.address),args};save(c.id+'-deployment',d);suite.push(d);save('suite',suite);
  let state=await read(c.id+'-initial',['call',contract,'get_state']);assert(equal(state,initial(c,d)),'Initial roster, budgets and open state');save(c.id+'-initial-state',state);
  const trace=[];
  for(const item of plan(c,d)){
   process.env.PURSE_ACCOUNT=accounts[item.caller].name;
   const before=state,hash=await invoke(item.label,['write',contract,item.method,...(item.args.length?['--args',...item.args]:[])]),r=await receipt(item.label,hash,!item.error);
   state=await read(item.label+'-state',['call',contract,'get_state']);assert((r.from_address||r.sender).toLowerCase()===d.callers[item.caller],'Actual voter signer');
   replay(before,item,state,c,d);
   if(item.error){const decoded=await read(item.label+'-decoded',['receipt',hash,'--status','FINALIZED','--retries','2']);assert(JSON.stringify(decoded).includes(item.error),'Exact expected rejection');save(item.label+'-decoded-receipt',decoded);}
   trace.push({...item,contract,transaction:hash,sender:d.callers[item.caller],state_before:before,state});save(item.label,trace.at(-1));save(c.id+'-trace',trace);
   console.log('VERIFIED',item.label,state.ballots.length,state.result.status||'OPEN');
  }
  save(c.id+'-final-state',state);
 }
}
main().catch(e=>{console.error(e.stack,e.cause?.message||'');process.exitCode=1;});
