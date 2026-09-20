import {buildCompetitions,competitionSignature,createTournamentDraw} from './draw.js';
import {logoForClass} from './class-logos.js';

const storageKey='interclasse-tournament-draw-v3';
const secureRandom=()=>{
 const value=new Uint32Array(1);
 crypto.getRandomValues(value);
 return value[0]/4294967296;
};

function readSavedDraw(){
 try{return JSON.parse(localStorage.getItem(storageKey)||'null');}catch{return null;}
}

function participantLabel(participant){
 return `${participant.studentCount} ${participant.studentCount===1?'aluno':'alunos'}`;
}

function teamIdentity(team,esc,size='compact'){
 const logo=logoForClass(team);
 return logo?`<span class="team-identity has-logo ${size}"><img src="${logo}" alt="Logo da turma ${esc(team)}"><span class="team-name">${esc(team)}</span></span>`:`<span class="team-identity ${size}"><span class="team-name">${esc(team)}</span></span>`;
}

function activateLogoFallback(root){
 root.querySelectorAll('.team-identity img').forEach(image=>{
  const fail=()=>{image.hidden=true;image.closest('.team-identity')?.classList.add('logo-failed');};
  if(image.complete&&!image.naturalWidth)fail();
  else image.addEventListener('error',fail,{once:true});
 });
}

function statusFor(competition){
 if(!competition.participants.length)return ['waiting','Aguardando inscrições'];
 if(competition.participants.length===1)return ['automatic','Classificação automática'];
 return ['ready','Pronta para o sorteio'];
}

function bracketSummary(bracket,esc){
 if(!bracket)return '';
 if(bracket.automaticWinner)return `<div class="draw-card-result"><strong>${esc(bracket.automaticWinner)}</strong> avança automaticamente.</div>`;
 if(bracket.format==='groups-knockout')return `<div class="draw-card-result group-summary"><span><b>Grupo A</b> ${bracket.groups.A.map(esc).join(', ')}</span><span><b>Grupo B</b> ${bracket.groups.B.map(esc).join(', ')}</span><small>Os 4 primeiros de cada grupo avançam ao mata-mata.</small></div>`;
 const matches=bracket.rounds[0]?.matches||[];
 return `<div class="draw-card-result">${matches.map(match=>match.b?`<span>${esc(match.a)} <b>×</b> ${esc(match.b)}</span>`:`<span>${esc(match.a)} <b>avança direto</b></span>`).join('')}</div>`;
}

function competitionCard(competition,draw,esc){
 const [statusClass,status]=statusFor(competition);
 const bracket=draw?.brackets?.[competition.id];
 return `<article class="draw-card ${statusClass}">
  <div class="draw-card-top"><span>${esc(competition.category)}</span><span class="draw-status">${status}</span></div>
  <h3>${esc(competition.title)}</h3>
  ${competition.modalityName!==competition.title?`<p class="draw-modality">${esc(competition.modalityName)}</p>`:''}
  <div class="draw-classes">${competition.participants.length?competition.participants.map(participant=>`<span>${teamIdentity(participant.className,esc,'tiny')}<small>${participantLabel(participant)}</small></span>`).join(''):'<p>Nenhuma turma com estudantes inscritos.</p>'}</div>
  ${bracketSummary(bracket,esc)}
 </article>`;
}

function matchMarkup(match,esc){
 return `<div class="bracket-match ${match.b?'':'has-bye'}">
  <span>${teamIdentity(match.a||'A definir',esc,'bracket')}</span>
  <i>${match.b?'×':'avança direto'}</i>
  ${match.b?`<span>${teamIdentity(match.b,esc,'bracket')}</span>`:''}
 </div>`;
}

function collectiveStageMarkup(bracket,state,esc){
 if(state.showKnockout)return `<div class="revealed-groups">${['A','B'].map(group=>`<section><b>Grupo ${group}</b><div>${bracket.groups[group].map(team=>teamIdentity(team,esc,'summary')).join('')}</div></section>`).join('')}</div><div class="knockout-heading"><span>MATA-MATA</span><strong>Os 4 melhores de cada grupo avançam</strong></div><div class="bracket-board collective-bracket">${bracket.knockout.rounds.map(round=>`<section class="bracket-round"><h3>${esc(round.name)}</h3><div>${round.matches.map(match=>matchMarkup(match,esc)).join('')}</div></section>`).join('')}</div>`;
 const revealOrder=bracket.revealOrder||[];
 const revealed=Math.min(state.revealed||0,revealOrder.length);
 const last=revealed?revealOrder[revealed-1]:null;
 const groupMarkup=group=>{
  const received=last?.group===group?' just-received':'';
  return `<section class="suspense-group group-${group.toLowerCase()}${received}"><div class="group-title"><span>LADO ${group}</span><h3>Grupo ${group}</h3><small>${revealOrder.slice(0,revealed).filter(item=>item.group===group).length}/${bracket.groups[group].length}</small></div><div class="group-slots">${bracket.groups[group].map(team=>{const revealIndex=revealOrder.findIndex(item=>item.team===team);const visible=revealIndex<revealed;const hasLogo=Boolean(logoForClass(team));return `<span class="group-slot ${visible?'is-revealed':'is-hidden'} ${visible&&hasLogo?'with-logo':''}"><i>${visible?'✦':'?'}</i>${visible?teamIdentity(team,esc,'group'):'<b>A revelar</b>'}</span>`;}).join('')}</div></section>`;
 };
 return `<div class="presentation-rule suspense-rule"><strong>Sorteio dos grupos</strong><span>Uma turma por vez · os 4 melhores de cada grupo avançam</span></div><div class="suspense-arena">${groupMarkup('A')}<div class="draw-machine"><div class="draw-orbit orbit-one"></div><div class="draw-orbit orbit-two"></div><span class="machine-label">${revealed===revealOrder.length?'GRUPOS DEFINIDOS':revealed?'ÚLTIMA SORTEADA':'PRÓXIMA TURMA'}</span><div class="reveal-card ${last?'has-result':''}"><small id="reveal-destination">${last?`GRUPO ${last.group}`:'O destino será revelado'}</small><div id="reveal-team" class="reveal-team">${last?teamIdentity(last.team,esc,'featured'):'?'}</div></div><div class="reveal-progress"><span style="width:${revealOrder.length?revealed/revealOrder.length*100:0}%"></span></div><p>${revealed} de ${revealOrder.length} turmas reveladas</p><div class="sparkles" aria-hidden="true"><i>✦</i><i>✧</i><i>✦</i><i>✧</i></div></div>${groupMarkup('B')}</div>`;
}

function slideMarkup(competition,bracket,index,total,esc,state={}){
 let content='';
 if(bracket.automaticWinner){
  content=`<div class="automatic-winner"><span>Única turma inscrita</span><strong>${esc(bracket.automaticWinner)}</strong><p>Classificada automaticamente para esta competição.</p></div>`;
 }else if(bracket.format==='groups-knockout'){
  content=collectiveStageMarkup(bracket,state,esc);
 }else{
  content=`<div class="bracket-board">${bracket.rounds.map(round=>`<section class="bracket-round"><h3>${esc(round.name)}</h3><div>${round.matches.map(match=>matchMarkup(match,esc)).join('')}</div></section>`).join('')}</div>`;
 }
 return `<div class="draw-slide">
  <header><div><span class="presentation-kicker">SORTEIO OFICIAL · ${esc(competition.category)}</span><h2>${esc(competition.title)}</h2>${competition.modalityName!==competition.title?`<p>${esc(competition.modalityName)}</p>`:''}</div><div class="slide-number">${index+1}<small>/ ${total}</small></div></header>
  <div class="presentation-entrants"><span>${competition.participants.length} ${competition.participants.length===1?'turma inscrita':'turmas inscritas'}</span>${bracket.format==='groups-knockout'?'<em>A distribuição será revelada ao vivo</em>':competition.participants.map(item=>teamIdentity(item.className,esc,'entrant')).join('')}</div>
  ${content}
 </div>`;
}

export function mountDrawAdmin(root,{rows,modalities,esc}){
 const title=root.querySelector('.admin-title');
 const filters=root.querySelector('.admin-filters');
 const results=root.querySelector('#admin-results');
 const tabs=document.createElement('div');
 tabs.className='admin-tabs';
 tabs.innerHTML='<button class="selected" data-admin-tab="registrations">Inscritos</button><button data-admin-tab="draw">Sorteio dos chaveamentos</button>';
 const registrationsPanel=document.createElement('section');
 registrationsPanel.className='admin-panel';
 registrationsPanel.dataset.adminPanel='registrations';
 const drawPanel=document.createElement('section');
 drawPanel.className='admin-panel';
 drawPanel.dataset.adminPanel='draw';
 drawPanel.hidden=true;
 registrationsPanel.append(filters,results);
 title.after(tabs);
 tabs.after(registrationsPanel);
 registrationsPanel.after(drawPanel);

 const competitions=buildCompetitions(modalities,rows);
 const signature=competitionSignature(competitions);
 let savedDraw=readSavedDraw();
 let drawIsCurrent=savedDraw?.version===3&&savedDraw.signature===signature;

 function renderDrawPanel(){
  const eligible=competitions.filter(competition=>competition.participants.length);
  const ready=competitions.filter(competition=>competition.participants.length>=2).length;
  const automatic=competitions.filter(competition=>competition.participants.length===1).length;
  drawPanel.innerHTML=`<div class="draw-heading"><div><span class="eyebrow dark">ORGANIZAÇÃO DAS DISPUTAS</span><h2>Sorteio dos chaveamentos</h2><p>Somente turmas com estudantes inscritos participam. O atletismo é separado por prova e categoria.</p></div><div class="draw-actions"><button id="present-draw" class="admin-secondary" ${drawIsCurrent&&eligible.length?'':'disabled'}>Apresentar sorteio</button><button id="run-draw" class="submit">${drawIsCurrent?'Refazer sorteio':'Realizar sorteio'} <span>↗</span></button></div></div>
   <div class="draw-overview"><div><strong>${eligible.length}</strong><span>competições com inscritos</span></div><div><strong>${ready}</strong><span>chaveamentos para sortear</span></div><div><strong>${automatic}</strong><span>classificações automáticas</span></div><p>${drawIsCurrent?`Sorteio realizado em ${new Date(savedDraw.generatedAt).toLocaleString('pt-BR')}.`:savedDraw?'As inscrições mudaram desde o último sorteio. Realize um novo sorteio.':'Nenhum sorteio realizado neste navegador.'}</p></div>
   <div class="draw-grid">${competitions.map(competition=>competitionCard(competition,drawIsCurrent?savedDraw:null,esc)).join('')}</div>
   <div class="clear-draw-area"><div><strong>Área de testes</strong><p>Limpe o resultado atual para realizar um sorteio novo desde o início. As inscrições não serão alteradas.</p></div><button id="clear-draw" class="danger-secondary" ${savedDraw?'':'disabled'}>Limpar sorteio</button></div>
   <dialog id="draw-presentation" class="draw-presentation"><button class="close" aria-label="Fechar">×</button><div id="draw-slide"></div><footer><button id="previous-slide" class="admin-secondary">← Anterior</button><span id="slide-progress"></span><button id="next-slide" class="submit">Próxima →</button></footer></dialog>`;
  drawPanel.querySelector('#run-draw').onclick=()=>{
   if(drawIsCurrent&&!confirm('Refazer o sorteio substituirá o chaveamento salvo neste navegador. Continuar?'))return;
   savedDraw=createTournamentDraw(competitions,secureRandom);
   try{localStorage.setItem(storageKey,JSON.stringify(savedDraw));}catch{}
   drawIsCurrent=true;
   renderDrawPanel();
   openPresentation();
  };
  drawPanel.querySelector('#present-draw').onclick=openPresentation;
  drawPanel.querySelector('#clear-draw').onclick=()=>{
   if(!savedDraw||!confirm('Limpar o sorteio atual? As inscrições serão mantidas.'))return;
   try{localStorage.removeItem(storageKey);}catch{}
   savedDraw=null;
   drawIsCurrent=false;
   renderDrawPanel();
  };
 }

 function openPresentation(){
  const eligible=competitions.filter(competition=>competition.participants.length&&savedDraw?.brackets?.[competition.id]);
  if(!drawIsCurrent||!eligible.length)return;
  const dialog=drawPanel.querySelector('#draw-presentation');
  let current=0;
  let busy=false;
  let drawTimer=null;
  let revealTimeout=null;
  const states=Object.fromEntries(eligible.map(competition=>[competition.id,{revealed:0,showKnockout:false}]));
  [...new Set(eligible.flatMap(competition=>competition.participants.map(item=>logoForClass(item.className))).filter(Boolean))].forEach(source=>{const image=new Image();image.src=source;});
  const show=()=>{
   const competition=eligible[current];
   const bracket=savedDraw.brackets[competition.id];
   const state=states[competition.id];
   dialog.querySelector('#draw-slide').innerHTML=slideMarkup(competition,bracket,current,eligible.length,esc,state);
   activateLogoFallback(dialog);
   dialog.querySelector('#slide-progress').textContent=`${current+1} de ${eligible.length}`;
   dialog.querySelector('#previous-slide').disabled=current===0&&!state.showKnockout;
   const next=dialog.querySelector('#next-slide');
   next.disabled=false;
   if(bracket.format==='groups-knockout'&&!state.showKnockout){
    next.textContent=state.revealed<bracket.revealOrder.length?`${state.revealed?'Sortear próxima turma':'Começar o sorteio'} →`:'Ver mata-mata →';
   }else next.textContent=current===eligible.length-1?'Encerrar':'Próxima competição →';
   };
  const finishReveal=()=>{
   const competition=eligible[current],bracket=savedDraw.brackets[competition.id],state=states[competition.id];
   state.revealed=Math.min(state.revealed+1,bracket.revealOrder.length);
   busy=false;
   drawTimer=null;
   revealTimeout=null;
   show();
  };
  const revealNext=()=>{
   if(busy)return;
   const competition=eligible[current],bracket=savedDraw.brackets[competition.id],state=states[competition.id];
   const remaining=bracket.revealOrder.slice(state.revealed);
   if(!remaining.length)return;
   busy=true;
   const nextButton=dialog.querySelector('#next-slide');
   nextButton.disabled=true;
   nextButton.textContent='Sorteando…';
   const card=dialog.querySelector('.reveal-card');
   card?.classList.add('is-shuffling');
   let tick=0;
   drawTimer=setInterval(()=>{
    const candidate=remaining[tick%remaining.length];
    const team=dialog.querySelector('#reveal-team'),destination=dialog.querySelector('#reveal-destination');
    if(team)team.textContent=candidate.team;
    if(destination)destination.textContent=tick%3===2?`GRUPO ${candidate.group}`:'GRUPO ?';
    tick++;
    if(tick>=22){
     clearInterval(drawTimer);
     drawTimer=null;
     const selected=bracket.revealOrder[state.revealed];
     if(team)team.innerHTML=teamIdentity(selected.team,esc,'spotlight');
     if(destination)destination.textContent=`GRUPO ${selected.group}`;
     card?.classList.remove('is-shuffling');
     card?.classList.add('is-announcing');
     dialog.querySelector('.draw-machine')?.classList.add('is-announcing');
     const label=dialog.querySelector('.machine-label');
     if(label)label.textContent='TURMA SORTEADA';
     activateLogoFallback(dialog);
     revealTimeout=setTimeout(finishReveal,1900);
    }
   },85);
  };
  const closePresentation=()=>{
   if(drawTimer)clearInterval(drawTimer);
   if(revealTimeout)clearTimeout(revealTimeout);
   if(document.fullscreenElement===dialog)document.exitFullscreen().catch(()=>{});
   dialog.close();
  };
  dialog.querySelector('.close').onclick=closePresentation;
  dialog.querySelector('#previous-slide').onclick=()=>{
   if(busy)return;
   const competition=eligible[current],state=states[competition.id];
   if(state.showKnockout){state.showKnockout=false;show();}
   else if(current>0){current--;show();}
  };
  dialog.querySelector('#next-slide').onclick=()=>{
   if(busy)return;
   const competition=eligible[current],bracket=savedDraw.brackets[competition.id],state=states[competition.id];
   if(bracket.format==='groups-knockout'&&!state.showKnockout){
    if(state.revealed<bracket.revealOrder.length)revealNext();
    else{state.showKnockout=true;show();}
    return;
   }
   if(current===eligible.length-1)closePresentation();else{current++;show();}
  };
  dialog.onkeydown=event=>{
   if(event.key==='ArrowRight')dialog.querySelector('#next-slide').click();
   if(event.key==='ArrowLeft')dialog.querySelector('#previous-slide').click();
   };
  show();
  dialog.showModal();
  dialog.requestFullscreen?.().catch(()=>{});
 }

 tabs.querySelectorAll('[data-admin-tab]').forEach(button=>button.onclick=()=>{
  const selected=button.dataset.adminTab;
  tabs.querySelectorAll('button').forEach(item=>item.classList.toggle('selected',item===button));
  registrationsPanel.hidden=selected!=='registrations';
  drawPanel.hidden=selected!=='draw';
  if(selected==='draw')renderDrawPanel();
 });
 renderDrawPanel();
}
