export const athleticsDivisions=['Masculino','Feminino'];

const classCompare=(a,b)=>a.localeCompare(b,'pt-BR',{numeric:true,sensitivity:'base'});

function participantsFor(rows,predicate){
 const counts=new Map();
 rows.filter(predicate).forEach(row=>counts.set(row.class_name,(counts.get(row.class_name)||0)+1));
 return [...counts].map(([className,studentCount])=>({className,studentCount})).sort((a,b)=>classCompare(a.className,b.className));
}

export function buildCompetitions(modalities,rows){
 return modalities.flatMap(modality=>{
  if(modality.id==='atletismo'&&modality.events){
   return modality.events.flatMap(eventName=>athleticsDivisions.map(division=>({
    id:`${modality.id}:${eventName}:${division}`,
    modalityId:modality.id,
    modalityName:modality.name,
    title:`${eventName} — ${division}`,
    category:modality.category,
    eventName,
    division,
    participants:participantsFor(rows,row=>row.modality_id===modality.id&&row.event_name===eventName&&row.division===division)
   })));
  }
  return [{
   id:modality.id,
   modalityId:modality.id,
   modalityName:modality.name,
   title:modality.name,
   category:modality.category,
   participants:participantsFor(rows,row=>row.modality_id===modality.id)
  }];
 });
}

export function competitionSignature(competitions){
 return competitions.map(competition=>`${competition.id}=${competition.participants.map(item=>item.className).join(',')}`).join('|');
}

export function shuffle(items,random=Math.random){
 const result=[...items];
 for(let index=result.length-1;index>0;index--){
  const target=Math.floor(random()*(index+1));
  [result[index],result[target]]=[result[target],result[index]];
 }
 return result;
}

function roundNames(total){
 const names=[];
 for(let index=0;index<total;index++){
  const remaining=total-index;
  names.push(remaining===1?'Final':remaining===2?'Semifinais':remaining===3?'Quartas de final':remaining===4?'Oitavas de final':`${index+1}ª fase`);
 }
 return names;
}

function interleave(byes,matches){
 const result=[];
 while(byes.length||matches.length){
  if(byes.length)result.push(byes.shift());
  if(matches.length)result.push(matches.shift());
 }
 return result;
}

export function createBracket(participants,random=Math.random){
 const teams=shuffle(participants.map(item=>typeof item==='string'?item:item.className),random);
 if(!teams.length)return {format:'knockout',participantCount:0,rounds:[],automaticWinner:null};
 if(teams.length===1)return {format:'knockout',participantCount:1,rounds:[],automaticWinner:teams[0]};

 const size=2**Math.ceil(Math.log2(teams.length));
 const byeCount=size-teams.length;
 const byeMatches=teams.slice(0,byeCount).map(team=>({a:team,b:null,bye:true}));
 const remaining=teams.slice(byeCount);
 const playedMatches=[];
 for(let index=0;index<remaining.length;index+=2)playedMatches.push({a:remaining[index],b:remaining[index+1],bye:false});
 const firstMatches=interleave(byeMatches,playedMatches);
 const totalRounds=Math.log2(size);
 const names=roundNames(totalRounds);
 const rounds=[{name:names[0],matches:firstMatches}];
 let sources=firstMatches.map((match,index)=>match.b?`Vencedor do confronto ${index+1}`:match.a);

 for(let roundIndex=1;roundIndex<totalRounds;roundIndex++){
  const matches=[];
  for(let index=0;index<sources.length;index+=2)matches.push({a:sources[index],b:sources[index+1],bye:false});
  rounds.push({name:names[roundIndex],matches});
  sources=matches.map((_,index)=>`Vencedor de ${names[roundIndex].toLowerCase()} ${index+1}`);
 }
 return {format:'knockout',participantCount:teams.length,rounds,automaticWinner:null};
}

export function createGroupTournament(participants,random=Math.random){
 const teams=shuffle(participants.map(item=>typeof item==='string'?item:item.className),random);
 if(teams.length<2)return createBracket(teams,random);
 const groups={A:[],B:[]};
 teams.forEach((team,index)=>groups[index%2===0?'A':'B'].push(team));
 return {
  format:'groups-knockout',
  participantCount:teams.length,
  groups,
  revealOrder:teams.map((team,index)=>({team,group:index%2===0?'A':'B'})),
  qualifiersPerGroup:4,
  knockout:{
   format:'knockout',
   participantCount:8,
   automaticWinner:null,
   rounds:[
    {name:'Quartas de final',matches:[
     {a:'1º do Grupo A',b:'4º do Grupo B',bye:false},
     {a:'2º do Grupo B',b:'3º do Grupo A',bye:false},
     {a:'1º do Grupo B',b:'4º do Grupo A',bye:false},
     {a:'2º do Grupo A',b:'3º do Grupo B',bye:false}
    ]},
    {name:'Semifinais',matches:[
     {a:'Vencedor das quartas 1',b:'Vencedor das quartas 2',bye:false},
     {a:'Vencedor das quartas 3',b:'Vencedor das quartas 4',bye:false}
    ]},
    {name:'Final',matches:[{a:'Vencedor da semifinal 1',b:'Vencedor da semifinal 2',bye:false}]}
   ]
  }
 };
}

export function createTournamentDraw(competitions,random=Math.random){
 return {
  version:3,
  generatedAt:new Date().toISOString(),
  signature:competitionSignature(competitions),
  brackets:Object.fromEntries(competitions.map(competition=>[
   competition.id,
   competition.category==='Coletivos'?createGroupTournament(competition.participants,random):createBracket(competition.participants,random)
  ]))
 };
}
