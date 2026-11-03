import { questions } from './questions.js';

const json = (data, status=200) => Response.json(data, {status, headers:{'Cache-Control':'no-store'}});
const codePattern = /^[A-Z0-9]{6}$/;
export default {
 async fetch(request, env) {
  const url = new URL(request.url);
  if (url.pathname === '/api/create' && request.method === 'POST') {
   const body = await request.json().catch(()=>({}));
   for (let i=0;i<5;i++) {
    const bytes=crypto.getRandomValues(new Uint8Array(6));
    const code=Array.from(bytes, b=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b%32]).join('');
    const res=await env.ROOMS.get(env.ROOMS.idFromName(code)).fetch('http://room/create', {method:'POST',body:JSON.stringify({...body,code})});
    if (res.status!==409) return res;
   }
   return json({error:'部屋を作れませんでした。もう一度お試しください。'},503);
  }
  const match=url.pathname.match(/^\/api\/rooms\/([A-Z0-9]{6})\/(join|state|start|buzz|answer)$/);
  if (match && codePattern.test(match[1])) return env.ROOMS.get(env.ROOMS.idFromName(match[1])).fetch(new Request(`http://room/${match[2]}`,request));
  if (url.pathname.startsWith('/api/')) return json({error:'見つかりません。'},404);
  return env.ASSETS.fetch(request);
 }
};

export class Room {
 constructor(ctx){ this.ctx=ctx; }
 async fetch(request){
  return this.ctx.blockConcurrencyWhile(async()=>{
   let state=await this.ctx.storage.get('state');
   const action=new URL(request.url).pathname.slice(1);
   const body=request.method==='POST'?await request.json().catch(()=>({})):{};
   if(action==='create'){
    if(state) return json({error:'この部屋は使用中です。'},409);
    const name=validName(body.name); if(!name) return json({error:'名前を入力してください（12文字以内）。'},400);
    const player={id:crypto.randomUUID(),name,score:0};
    state={code:body.code,players:[player],host:player.id,phase:'lobby',index:0,locked:[],answerer:null};
    await this.save(state); return json({code:state.code,playerId:player.id});
   }
   if(!state) return json({error:'部屋が見つかりません。'},404);
   await advance(state,Date.now());
   if(action==='join'){
    if(state.phase!=='lobby') return json({error:'このゲームは既に始まっています。'},409);
    if(state.players.length>=4) return json({error:'部屋は満員です（定員4人）。'},409);
    const name=validName(body.name); if(!name) return json({error:'名前を入力してください（12文字以内）。'},400);
    const player={id:crypto.randomUUID(),name,score:0}; state.players.push(player); await this.save(state);
    return json({code:state.code,playerId:player.id});
   }
   const token=request.headers.get('X-Player-Id') || body.playerId;
   const player=state.players.find(p=>p.id===token);
   if(!player) return json({error:'プレイヤーを確認できません。'},401);
   if(action==='start'){
    if(player.id!==state.host || state.phase!=='lobby' || state.players.length<2 || state.players.length>4) return json({error:'ホストが2〜4人で開始できます。'},409);
    startQuestion(state,Date.now());
   } else if(action==='buzz'){
    if(state.phase!=='question' || state.answerer || state.locked.includes(player.id)) return json({error:'今は早押しできません。'},409);
    state.answerer=player.id; state.answerDeadline=Math.min(Date.now()+10000,state.questionDeadline);
   } else if(action==='answer'){
    if(state.phase!=='question' || state.answerer!==player.id || !Number.isInteger(body.choice) || body.choice<0 || body.choice>3) return json({error:'回答できません。'},409);
    if(body.choice===questions[state.index][2]){ player.score+=10; reveal(state,Date.now(),`${player.name}さんが正解！`); }
    else {player.score-=5; state.locked.push(player.id); state.answerer=null; state.answerDeadline=null; if(state.locked.length===state.players.length) reveal(state,Date.now(),'全員の回答が終わりました');}
   } else if(action!=='state') return json({error:'見つかりません。'},404);
   await this.save(state);
   return json(view(state,player.id));
  });
 }
 async save(state){await this.ctx.storage.put('state',state); const next=deadline(state); if(next) await this.ctx.storage.setAlarm(next); else await this.ctx.storage.deleteAlarm();}
 async alarm(){await this.ctx.blockConcurrencyWhile(async()=>{const s=await this.ctx.storage.get('state'); if(s){await advance(s,Date.now()); await this.save(s);}});}
}
function validName(value){if(typeof value!=='string') return null; const name=value.trim(); return name.length>0 && name.length<=12?name:null;}
function startQuestion(s,now){s.phase='question';s.locked=[];s.answerer=null;s.answerDeadline=null;s.questionDeadline=now+20000;s.revealDeadline=null;}
function reveal(s,now,message){s.phase='reveal';s.message=message;s.answerer=null;s.answerDeadline=null;s.revealDeadline=now+3000;}
function deadline(s){if(s.phase==='question') return Math.min(s.questionDeadline,s.answerDeadline||Infinity); if(s.phase==='reveal') return s.revealDeadline; return null;}
async function advance(s,now){
 if(s.phase==='question'){
  if(now>=s.questionDeadline) reveal(s,s.questionDeadline,'時間切れ！');
  else if(s.answerer && now>=s.answerDeadline){const p=s.players.find(p=>p.id===s.answerer);p.score-=5;s.locked.push(p.id);s.answerer=null;s.answerDeadline=null;if(s.locked.length===s.players.length) reveal(s,now,'全員の回答が終わりました');}
 }
 if(s.phase==='reveal' && now>=s.revealDeadline){if(s.index===questions.length-1){s.phase='finished';s.revealDeadline=null;} else {s.index++;startQuestion(s,now);}}
}
function view(s,id){const q=questions[s.index];return {code:s.code,players:s.players.map(p=>({id:p.id,name:p.name,score:p.score})),host:s.host,me:id,phase:s.phase,index:s.index,total:questions.length,locked:s.locked,answerer:s.answerer,question:s.phase==='question'||s.phase==='reveal'?{text:q[0],choices:q[1],...(s.phase==='reveal'?{correct:q[2]}:{})}:null,questionDeadline:s.questionDeadline,answerDeadline:s.answerDeadline,revealDeadline:s.revealDeadline,message:s.message,serverTime:Date.now()};}
