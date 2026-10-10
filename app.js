import { createRun, updateRun, moveLane, jump, jumpHeight, starRating, speedAt, STAGES } from './engine.js';
const $ = id => document.getElementById(id);
const canvas = $('game'), ctx = canvas.getContext('2d');
const sprite = new Image(); sprite.src = 'assets/runner-back.png';
const STORAGE = 'jitian-adventure-v1';
const BADGES = [
  {id:'first',icon:'❧',name:'第一片家乡绿',text:'完成一次冒险，不论输赢'},
  {id:'finish',icon:'⚑',name:'校园小勇士',text:'跑到三段冒险的终点'},
  {id:'combo',icon:'✦',name:'追风收集家',text:'在一局中连续收集 12 次'},
  {id:'flower',icon:'✿',name:'白花守护者',text:'在一局中收集 3 朵白花'},
  {id:'craft',icon:'✂',name:'剪纸小匠',text:'拼好任意一幅剪纸作品'},
  {id:'allcraft',icon:'❀',name:'家乡创作家',text:'完成三种剪纸作品'}
];
let saved = {best:0,runs:0,total:0,badges:[],crafts:[]};
try {
  const old = JSON.parse(localStorage.getItem(STORAGE) || '{}');
  for (const k of ['best','runs','total']) if (Number.isFinite(old[k]) && old[k]>=0) saved[k]=Math.min(old[k],9999999);
  saved.badges = Array.isArray(old.badges) ? old.badges.filter(id=>BADGES.some(b=>b.id===id)) : [];
  saved.crafts = Array.isArray(old.crafts) ? old.crafts.filter(id=>['flower','leaf','star'].includes(id)) : [];
} catch {}
function save(){try{localStorage.setItem(STORAGE,JSON.stringify(saved));}catch{} $('bestScore').textContent=saved.best;}
save();
let run=null, mode='easy', activeTab='adventure', phase='idle', width=600, height=500, lastFrame=0, ambient=0, countdownRemaining=0, particles=[], floaters=[], toastTimer=0, soundEnabled=false, audio=null;
function tone(frequency=600,duration=.08,volume=.035){
  if(!soundEnabled)return;
  try{audio ||= new (window.AudioContext||window.webkitAudioContext)(); if(audio.state==='suspended')audio.resume().catch(()=>{}); const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency,audio.currentTime);gain.gain.setValueAtTime(volume,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+duration);oscillator.connect(gain);gain.connect(audio.destination);oscillator.start();oscillator.stop(audio.currentTime+duration);}catch{}
}
$('sound').onclick=()=>{soundEnabled=!soundEnabled;$('sound').setAttribute('aria-pressed',String(soundEnabled));$('sound').setAttribute('aria-label',soundEnabled?'关闭音效':'开启音效');$('sound').title=soundEnabled?'关闭音效':'开启音效';$('sound').querySelector('span').hidden=soundEnabled;tone(720,.1);};
const search=new URLSearchParams(location.search);
if(search.get('from')==='nfc'){$('nfcWelcome').hidden=false; document.body.classList.add('from-nfc');}
function notify(text){$('siteToast').textContent=text;$('siteToast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('siteToast').classList.remove('show'),3000);}
function gameMessage(text){$('gameToast').textContent=text;$('gameToast').classList.add('show');clearTimeout(gameMessage.timer);gameMessage.timer=setTimeout(()=>$('gameToast').classList.remove('show'),2000);}
function setTab(tab){if(phase==='playing'||phase==='countdown')pauseGame();activeTab=tab;document.querySelectorAll('.tab-panel').forEach(el=>{el.hidden=el.id!==tab;el.classList.toggle('active',el.id===tab);});document.querySelectorAll('[data-tab]').forEach(el=>el.classList.toggle('active',el.dataset.tab===tab));if(tab==='collection')renderCollection();if(tab==='adventure')resize();}
document.querySelectorAll('[data-tab]').forEach(btn=>btn.onclick=()=>setTab(btn.dataset.tab));
document.querySelectorAll('[data-mode]').forEach(btn=>btn.onclick=()=>{mode=btn.dataset.mode;document.querySelectorAll('[data-mode]').forEach(b=>{const selected=b===btn;b.classList.toggle('chosen',selected);b.setAttribute('aria-pressed',String(selected));});tone(450,.04);});
function startGame(){
  run=createRun(mode);phase='countdown';countdownRemaining=2.7;particles=[];floaters=[];
  for(const id of ['intro','result','pauseOverlay'])$(id).hidden=true;
  $('countdown').hidden=false;$('countdown').textContent='3';$('hud').hidden=false;$('touchControls').hidden=false;$('powerLabel').hidden=true;updateHud();tone(520,.1);
}
function pauseGame(){if(!['playing','countdown'].includes(phase))return;pauseGame.previous=phase;phase='paused';$('pauseOverlay').hidden=false;$('countdown').hidden=true;$('touchControls').hidden=true;}
function resumeGame(){if(phase!=='paused')return;phase=pauseGame.previous||'playing';$('pauseOverlay').hidden=true;$('touchControls').hidden=false;if(phase==='countdown')$('countdown').hidden=false;lastFrame=performance.now();}
$('start').onclick=startGame;$('playAgain').onclick=startGame;$('restart').onclick=startGame;$('resume').onclick=resumeGame;$('pause').onclick=pauseGame;
$('craftAfter').onclick=()=>setTab('paper');$('backToGame').onclick=()=>setTab('adventure');
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseGame();});window.addEventListener('blur',pauseGame);
function action(type){if(phase!=='playing'||activeTab!=='adventure')return;if(type==='left')moveLane(run,-1);else if(type==='right')moveLane(run,1);else if(type==='jump')jump(run);}
document.querySelectorAll('[data-action]').forEach(btn=>btn.addEventListener('pointerdown',event=>{event.preventDefault();action(btn.dataset.action);}));
window.addEventListener('keydown',event=>{
  if($('helpDialog').open||activeTab!=='adventure'||event.target.matches('input,textarea'))return;
  if(['ArrowLeft','ArrowRight','ArrowUp',' ','a','d','w','A','D','W'].includes(event.key)&&phase==='playing'){event.preventDefault();if(!event.repeat)action(['ArrowLeft','a','A'].includes(event.key)?'left':['ArrowRight','d','D'].includes(event.key)?'right':'jump');}
  if(['p','P','Escape'].includes(event.key)){if(phase==='paused')resumeGame();else pauseGame();}
});
let touchStart=null;
canvas.addEventListener('pointerdown',event=>{touchStart={x:event.clientX,y:event.clientY};canvas.setPointerCapture(event.pointerId);});
canvas.addEventListener('pointerup',event=>{if(!touchStart)return;const dx=event.clientX-touchStart.x,dy=event.clientY-touchStart.y;touchStart=null;if(Math.abs(dx)>24&&Math.abs(dx)>Math.abs(dy))action(dx<0?'left':'right');else if(dy< -20||Math.abs(dx)<15&&Math.abs(dy)<15)action('jump');});canvas.addEventListener('pointercancel',()=>touchStart=null);
$('openHelp').onclick=()=>{pauseGame();$('helpDialog').showModal();};document.querySelectorAll('.dialog-close,.dialog-close-btn').forEach(btn=>btn.onclick=()=>$('helpDialog').close());
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if($('gameShell').requestFullscreen)await $('gameShell').requestFullscreen();else notify('你的浏览器暂不支持全屏，竖屏也能直接玩。');}catch{notify('暂时无法全屏，直接在这里玩吧。');}};
$('share').onclick=async()=>{const url=new URL('./',location.href).href;try{if(navigator.share)await navigator.share({title:'橘红少年大冒险',text:'碰一碰，和橘红少年一起出发！',url});else{await navigator.clipboard.writeText(url);notify('游戏网址已复制，分享给朋友吧！');}}catch(error){if(error.name!=='AbortError')notify('游戏网址：'+url);}};
function updateHud(){if(!run)return;$('score').innerHTML=run.score+'<small>分</small>';$('stageLabel').textContent=STAGES[run.stage];$('timeLeft').textContent=Math.max(0,Math.ceil(run.options.duration-run.time));$('hearts').textContent='♥'.repeat(run.hearts)+'♡'.repeat(run.options.hearts-run.hearts);$('progressFill').style.width=(run.time/run.options.duration*100)+'%';const powers=[];if(run.shield>0)powers.push('✿ 白花护盾 '+Math.ceil(run.shield)+'s');if(run.magnet>0)powers.push('✦ 花叶磁力 '+Math.ceil(run.magnet)+'s');$('powerLabel').hidden=!powers.length;$('powerLabel').textContent=powers.join(' · ');}
function award(id){if(saved.badges.includes(id))return false;saved.badges.push(id);return true;}
function finishGame(won){
  phase='result';$('result').hidden=false;$('touchControls').hidden=true;$('powerLabel').hidden=true;
  saved.runs++;saved.total+=run.collected;const previousBest=saved.best;saved.best=Math.max(saved.best,run.score);const earned=[];
  if(award('first'))earned.push('第一片家乡绿');if(won&&award('finish'))earned.push('校园小勇士');if(run.maxCombo>=12&&award('combo'))earned.push('追风收集家');if(run.flowers>=3&&award('flower'))earned.push('白花守护者');save();
  const stars=starRating(run);$('resultStars').textContent='✦ '.repeat(stars)+'✧ '.repeat(3-stars);$('resultTitle').textContent=won?'把快乐带回家啦！':'你已经很勇敢啦！';$('resultMessage').textContent=won?(run.score>previousBest?'新纪录！下次试着收集更多白花。':'三段旅程完成，一起庆祝小小进步。'):'换一条路，再试试看。每次出发都有进步。';$('resultScore').textContent=run.score;$('resultItems').textContent=run.collected;$('resultCombo').textContent=run.maxCombo;$('rewardNotice').textContent=earned.length?'新徽章：'+earned.join(' · '):'这次的快乐，已经存进你的收藏。';tone(won?800:360,.18);if(won)for(let i=0;i<55;i++)particles.push({x:Math.random()*width,y:Math.random()*height*.6,vx:(Math.random()-.5)*100,vy:50+Math.random()*80,life:2,color:i%2?'#d88474':'#95b862'});
}
function consumeEvents(){if(!run)return;for(const e of run.events.splice(0)){
  if(e.type==='collect'||e.type==='dodge'){const p=project(.83,e.lane);floaters.push({x:p.x,y:p.y-height*.18,text:'+'+e.points,life:.8});tone(e.kind==='flower'?930:640+Math.min(run.combo,20)*16,.045);for(let i=0;i<5;i++)particles.push({x:p.x,y:p.y-height*.14,vx:(Math.random()-.5)*120,vy:-60-Math.random()*50,life:.5,color:e.kind==='flower'?'#fff7dd':'#badb79'});}
  if(e.type==='hit'){gameMessage('别着急，换条路试试 ♡');tone(220,.16);}
  if(e.type==='shield')gameMessage('白花护盾！可以挡一次障碍 ✿');
  if(e.type==='magnet')gameMessage('花叶磁力！三条跑道一起收 ✦');
  if(e.type==='protected')gameMessage('保护罩帮你挡住啦！');
  if(e.type==='stage')gameMessage(['','进入剪纸小巷！','最后一站：积田运动场！'][e.stage]);
  if(e.type==='finish')finishGame(e.won);
}}
function resize(){const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;width=rect.width;height=rect.height;const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
new ResizeObserver(resize).observe($('gameShell'));window.addEventListener('resize',resize);document.addEventListener('fullscreenchange',resize);
function roundRect(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
function project(z,lane){const depth=z*z;const half=width*(.055+.50*depth);return{x:width/2+(lane-1)*half*.67,y:height*(.27+.72*depth),scale:.13+depth*1.18,half};}
function drawLeaf(x,y,s,color='#a7cc65',angle=-.3){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.beginPath();ctx.moveTo(-s*.55,s*.35);ctx.bezierCurveTo(-s*.65,-s*.7,s*.25,-s*.9,s*.65,-s*.55);ctx.bezierCurveTo(s*.8,s*.25,-s*.2,s*.7,-s*.55,s*.35);ctx.fillStyle=color;ctx.fill();ctx.strokeStyle='#47765d';ctx.lineWidth=Math.max(1,s*.045);ctx.beginPath();ctx.moveTo(-s*.6,s*.5);ctx.lineTo(s*.43,-s*.35);ctx.stroke();ctx.restore();}
function drawFlower(x,y,s,color='#fffaf0'){ctx.save();ctx.translate(x,y);for(let i=0;i<5;i++){ctx.save();ctx.rotate(i*Math.PI*2/5);ctx.beginPath();ctx.ellipse(0,-s*.55,s*.32,s*.5,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();ctx.strokeStyle='#547a3b25';ctx.lineWidth=1;ctx.stroke();ctx.restore();}ctx.beginPath();ctx.arc(0,0,s*.23,0,Math.PI*2);ctx.fillStyle='#e3af55';ctx.fill();ctx.restore();}
function drawTree(x,y,s,stage){ctx.save();ctx.translate(x,y);roundRect(-s*.06,-s*.12,s*.12,s*.34,s*.04,'#99a778');ctx.fillStyle=stage===1?'#88a38b':'#88b87b';for(const [dx,dy,r] of [[0,-.45,.35],[-.24,-.26,.28],[.25,-.27,.30]]){ctx.beginPath();ctx.arc(dx*s,dy*s,r*s,0,Math.PI*2);ctx.fill();}if(stage!==2){drawLeaf(s*.11,-s*.48,s*.26,'#afce87',.6);drawFlower(-s*.20,-s*.30,s*.07);}ctx.restore();}
function drawBackground(time,stage){
  const skies=['#e4efda','#f4e4d9','#e5eddf'];const sky=ctx.createLinearGradient(0,0,0,height);sky.addColorStop(0,skies[stage]);sky.addColorStop(1,'#eff2de');ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
  ctx.fillStyle='#fff9e8';ctx.beginPath();ctx.arc(width*.81,height*.12,Math.min(width,height)*.06,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#ccdcb7';ctx.beginPath();ctx.moveTo(0,height*.28);ctx.quadraticCurveTo(width*.18,height*.10,width*.45,height*.29);ctx.quadraticCurveTo(width*.68,height*.13,width,height*.28);ctx.lineTo(width,height*.4);ctx.lineTo(0,height*.4);ctx.fill();
  ctx.fillStyle=stage===2?'#cddbbe':'#dbe4c2';ctx.fillRect(0,height*.29,width,height);
  const roadTop=project(0,1),bottom=project(1.1,1);ctx.beginPath();ctx.moveTo(width/2-roadTop.half,height*.27);ctx.lineTo(width/2+roadTop.half,height*.27);ctx.lineTo(width/2+bottom.half,height*1.08);ctx.lineTo(width/2-bottom.half,height*1.08);ctx.closePath();ctx.fillStyle=stage===2?'#d3a495':stage===1?'#efdbc6':'#ece5ca';ctx.fill();
  for(let side=-1;side<=1;side+=2){ctx.strokeStyle=stage===2?'#fff3e2':'#d2c5a7';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(width/2+side*roadTop.half,height*.27);ctx.lineTo(width/2+side*bottom.half,height*1.08);ctx.stroke();}
  for(let stripe=0;stripe<11;stripe++){const z=((stripe/11+time*.14)%1);for(const lane of [.5,1.5]){const p1=project(z,lane),p2=project(Math.min(1.1,z+.045),lane);ctx.strokeStyle=stage===2?'#fff7e2':'#fff8e5bb';ctx.lineWidth=1+z*3;ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.stroke();}}
  for(let k=0;k<7;k++){const z=((k/7+time*.095)%1),p=project(z,1);for(const side of [-1,1]){const x=width/2+side*(p.half+width*(.08+.12*z));if(stage===1){const s=20+z*height*.10;ctx.save();ctx.translate(x,p.y);ctx.rotate(side*.2);drawFlower(0,-s*.7,s*.36,'#dc927d');drawLeaf(side*s*.3,-s*.1,s*.48,'#95ab85');ctx.restore();}else drawTree(x,p.y,20+z*height*.18,stage);}}
  if(stage===2){roundRect(width*.06,height*.15,width*.22,height*.045,5,'#668577');ctx.font='600 '+Math.max(9,width*.023)+'px sans-serif';ctx.fillStyle='#fff9e9';ctx.textAlign='center';ctx.fillText('积田 · 向上',width*.17,height*.18);}
  else if(stage===1){ctx.strokeStyle='#c8967e';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,height*.21);ctx.quadraticCurveTo(width/2,height*.28,width,height*.21);ctx.stroke();for(let i=0;i<7;i++){const x=width*i/6;ctx.fillStyle=i%2?'#e7af9e':'#b6c89b';ctx.beginPath();ctx.moveTo(x,height*.22);ctx.lineTo(x+width*.026,height*.28);ctx.lineTo(x+width*.05,height*.22);ctx.fill();}}
}
function drawEntity(e){const p=project(Math.max(0,e.z),e.lane),s=Math.min(width*.12,42)*p.scale;ctx.save();ctx.globalAlpha=e.z<0?0:1;ctx.fillStyle='#75845520';ctx.beginPath();ctx.ellipse(p.x,p.y+4,s*.8,s*.16,0,0,Math.PI*2);ctx.fill();
  if(e.type==='leaf'){const bob=Math.sin(ambient*4+e.id)*s*.06;drawLeaf(p.x,p.y-s*.75+bob,s*.72);}
  if(e.type==='flower')drawFlower(p.x,p.y-s*.85,s*.65);
  if(e.type==='cone'){roundRect(p.x-s*.7,p.y-s*.1,s*1.4,s*.23,4,'#c67762');ctx.beginPath();ctx.moveTo(p.x-s*.45,p.y);ctx.lineTo(p.x,p.y-s*1.30);ctx.lineTo(p.x+s*.45,p.y);ctx.closePath();ctx.fillStyle='#d99576';ctx.fill();ctx.fillStyle='#fff3db';ctx.beginPath();ctx.moveTo(p.x-s*.23,p.y-s*.63);ctx.lineTo(p.x+s*.23,p.y-s*.63);ctx.lineTo(p.x+s*.30,p.y-s*.43);ctx.lineTo(p.x-s*.30,p.y-s*.43);ctx.fill();}
  if(e.type==='puddle'){ctx.beginPath();ctx.ellipse(p.x,p.y,s*1.1,s*.32,0,0,Math.PI*2);ctx.fillStyle='#93b7b2';ctx.fill();ctx.strokeStyle='#d8eeec';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y-s*.02,s*.55,s*.15,0,0,Math.PI*2);ctx.stroke();}
  if(e.type==='magnet'){ctx.translate(p.x,p.y-s*.70);ctx.rotate(ambient*2);for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(s*.7,-s*.65);ctx.lineTo(s*.7,s*.15);ctx.closePath();ctx.fillStyle=i%2?'#d88474':'#b6d486';ctx.fill();}ctx.beginPath();ctx.arc(0,0,s*.16,0,Math.PI*2);ctx.fillStyle='#fff8dc';ctx.fill();}
  ctx.restore();}
function drawPlayer(){const position=run?run.lanePosition:1,p=project(.83,position),air=run?jumpHeight(run):0;const spriteH=Math.min(height*.215,width*.33),spriteW=spriteH*(sprite.naturalWidth/sprite.naturalHeight||2/3),bob=phase==='playing'?Math.sin(ambient*15)*2:Math.sin(ambient*2)*2;const y=p.y-air*height*.14+bob;
  ctx.save();ctx.fillStyle='#5a745239';ctx.beginPath();ctx.ellipse(p.x,p.y+4,spriteW*.29*(1-air*.3),spriteH*.035,0,0,Math.PI*2);ctx.fill();
  if(run&&run.shield>0){ctx.strokeStyle='#fffef0';ctx.lineWidth=3;ctx.fillStyle='#deefa926';ctx.beginPath();ctx.ellipse(p.x,y-spriteH*.52,spriteW*.56,spriteH*.53,0,0,Math.PI*2);ctx.fill();ctx.stroke();}
  const approaching=run?.entities.some(e=>['cone','puddle'].includes(e.type)&&e.z>.6&&e.z<.85&&Math.abs(e.lane-position)<.5);
  if(approaching)ctx.globalAlpha=.66;
  if(run&&run.invincible>0&&Math.floor(ambient*8)%2===0)ctx.globalAlpha=.5;
  if(sprite.complete&&sprite.naturalWidth)ctx.drawImage(sprite,p.x-spriteW/2,y-spriteH,spriteW,spriteH);
  else{drawFlower(p.x,y-height*.08,width*.06);drawLeaf(p.x,y-height*.18,width*.07);}
  ctx.restore();
}
function render(dt){
  drawBackground(run?run.distance*2.8:ambient*.4,run?run.stage:0);
  if(run){const behind=run.entities.filter(e=>e.z<=.83).sort((a,b)=>a.z-b.z),front=run.entities.filter(e=>e.z>.83).sort((a,b)=>a.z-b.z);behind.forEach(drawEntity);drawPlayer();front.forEach(drawEntity);}
  else{for(let i=0;i<6;i++)drawEntity({z:.17+i*.095,lane:i%3,type:i%3===0?'flower':'leaf',id:i});drawPlayer();}
  for(const p of particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;ctx.globalAlpha=Math.max(0,Math.min(1,p.life));ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;particles=particles.filter(p=>p.life>0);
  for(const f of floaters){f.life-=dt;f.y-=45*dt;ctx.globalAlpha=Math.max(0,f.life/.8);ctx.fillStyle='#234f43';ctx.textAlign='center';ctx.font='800 20px sans-serif';ctx.fillText(f.text,f.x,f.y);}ctx.globalAlpha=1;floaters=floaters.filter(f=>f.life>0);
  if(run&&phase==='playing'){ctx.textAlign='center';ctx.font='700 12px sans-serif';ctx.fillStyle='#3d6744';const speedLabel='速度 ×'+(speedAt(run)/(run.options.speed*.7)).toFixed(1);ctx.fillText(run.combo>=8?run.combo+' 连击 · ×'+Math.min(3,1+Math.floor(run.combo/8))+'  |  '+speedLabel:speedLabel,width/2,height*.23);}
}
function frame(timestamp){const dt=Math.min(.05,Math.max(0,(timestamp-lastFrame)/1000));lastFrame=timestamp;ambient+=dt;if(activeTab==='adventure'){
  if(phase==='countdown'){countdownRemaining-=dt;const num=Math.ceil(countdownRemaining);$('countdown').textContent=num>0?num:'出发！';if(countdownRemaining<=-.2){phase='playing';$('countdown').hidden=true;}}
  if(phase==='playing'){updateRun(run,dt);consumeEvents();updateHud();}
  render(phase==='paused'?0:dt);
}requestAnimationFrame(frame);}
resize();requestAnimationFrame(frame);

// The workshop uses five independently rotatable pieces. Every scramble is solvable.
const SVG='http://www.w3.org/2000/svg',patterns={flower:{name:'橘红白花',path:'M0 48 C-48 12 -44 -52 0 -73 C44 -52 48 12 0 48Z',color:'#d88474'},leaf:{name:'叶脉小扇',path:'M0 48 C-58 10 -39 -55 24 -67 C49 -18 35 20 0 48Z',color:'#63876b'},star:{name:'校园星光',path:'M0 -79 L23 -19 L44 17 L0 51 L-44 17 L-23 -19Z',color:'#d5a556'}};
let pattern='flower',rotations=[],paperComplete=false;
function svgNode(tag,attrs={}){const node=document.createElementNS(SVG,tag);for(const[k,v]of Object.entries(attrs))node.setAttribute(k,String(v));return node;}
function paperPosition(i){const a=i*2*Math.PI/5;return{x:240+Math.sin(a)*99,y:240-Math.cos(a)*99,angle:i*72};}
function newPaper(type=pattern){pattern=type;rotations=Array.from({length:5},()=>1+Math.floor(Math.random()*4));paperComplete=false;$('craftSuccess').hidden=true;$('downloadPaper').disabled=true;$('patternName').textContent=patterns[pattern].name;$('paperFeedback').textContent='点击一片，旋转一下。';document.querySelectorAll('[data-pattern]').forEach(b=>b.classList.toggle('selected',b.dataset.pattern===pattern));renderPaper();}
function rotatePiece(index){if(rotations[index]===0||paperComplete)return;rotations[index]=(rotations[index]+1)%5;tone(rotations[index]===0?760:430,.05);renderPaper();const count=rotations.filter(r=>r===0).length;if(count===5){paperComplete=true;$('craftSuccess').hidden=false;$('downloadPaper').disabled=false;$('paperFeedback').textContent='太棒了，五片全部对齐！';if(!saved.crafts.includes(pattern))saved.crafts.push(pattern);award('craft');if(saved.crafts.length===3)award('allcraft');save();notify('✿ 作品完成！剪纸徽章已放进收藏。');tone(960,.2);}}
function renderPaper(){const svg=$('paperCanvas');svg.replaceChildren();svg.append(svgNode('rect',{width:480,height:480,fill:'#fcfaf6'}));for(let i=0;i<5;i++){const p=paperPosition(i),target=svgNode('path',{d:patterns[pattern].path,transform:`translate(${p.x} ${p.y}) rotate(${p.angle})`,fill:'#f1e7da',stroke:'#d7c9b6','stroke-width':2,'stroke-dasharray':'5 5'});svg.append(target);}
  for(let i=0;i<5;i++){const p=paperPosition(i),isAligned=rotations[i]===0,g=svgNode('g',{transform:`translate(${p.x} ${p.y}) rotate(${p.angle+rotations[i]*72})`,role:'button',tabindex:isAligned?-1:0,'aria-label':`第${i+1}片${isAligned?'已对齐':'，点击旋转'}`,'aria-disabled':String(isAligned),class:'paper-piece','data-piece':i});const petal=svgNode('path',{d:patterns[pattern].path,fill:isAligned?'#dc8a78':patterns[pattern].color,stroke:'#fffaf0','stroke-width':3});g.append(petal);
  const veins=svgNode('path',{d:'M0 35 L0 -43 M0 -10 L-15 -22 M0 4 L17 -9',fill:'none',stroke:'#fff7ed','stroke-width':3,'stroke-linecap':'round',opacity:.82});g.append(veins);g.addEventListener('click',()=>rotatePiece(i));g.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();rotatePiece(i);if(rotations[i]!==0)svg.querySelector(`[data-piece="${i}"]`)?.focus();}});svg.append(g);}
  svg.append(svgNode('circle',{cx:240,cy:240,r:32,fill:'#fff9ea',stroke:'#d3a45b','stroke-width':2}));const center=svgNode('text',{x:240,y:248,'text-anchor':'middle',fill:'#c99847','font-size':24});center.textContent=rotations.every(r=>r===0)?'✦':'✿';svg.append(center);$('paperProgress').textContent=rotations.filter(r=>r===0).length+' / 5 对齐';}
document.querySelectorAll('[data-pattern]').forEach(btn=>btn.onclick=()=>newPaper(btn.dataset.pattern));$('resetPaper').onclick=()=>newPaper();
$('downloadPaper').onclick=()=>{if(!paperComplete)return;const clone=$('paperCanvas').cloneNode(true);clone.setAttribute('xmlns',SVG);clone.setAttribute('width','960');clone.setAttribute('height','960');clone.querySelectorAll('[tabindex]').forEach(n=>{n.removeAttribute('tabindex');n.removeAttribute('role');n.removeAttribute('class');});const xml=new XMLSerializer().serializeToString(clone);const objectUrl=URL.createObjectURL(new Blob([xml],{type:'image/svg+xml'}));const link=document.createElement('a');link.href=objectUrl;link.download='积田小学_'+patterns[pattern].name+'.svg';link.click();setTimeout(()=>URL.revokeObjectURL(objectUrl),2000);};
function renderCollection(){const labels=[['最好成绩',saved.best+' 分'],['出发次数',saved.runs+' 次'],['收集花叶',saved.total+' 片'],['剪纸作品',saved.crafts.length+' / 3']];$('collectionStats').innerHTML=labels.map(([label,value])=>`<div><strong>${value}</strong><span>${label}</span></div>`).join('');$('badgeList').innerHTML=BADGES.map(b=>{const unlocked=saved.badges.includes(b.id);return`<article class="badge-card ${unlocked?'':'locked'}"><div class="badge-icon">${unlocked?b.icon:'◇'}</div><h3>${b.name}</h3><p>${unlocked?'已点亮 · ':''}${b.text}</p></article>`;}).join('');}
newPaper();renderCollection();
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
