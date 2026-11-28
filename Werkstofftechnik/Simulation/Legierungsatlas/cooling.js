export function coolingChart(data,indices,cut,colors){
  const count=data.T.length;
  const curves=indices.map(i=>{
    const start=(i*(data.axes[1]?.length||1)+cut)*count;
    const energy=data.H.slice(start,start+count);
    return energy.map((h,t)=>h===null||energy.at(-1)===null?null:[(energy.at(-1)-h)/1000,data.T[t]]);
  });
  const limit=Math.max(1,...curves.flat().filter(Boolean).map(p=>p[0]));
  const y=t=>240-(t-data.T[0])*190/(data.T.at(-1)-data.T[0]);
  let out='<svg class="chart" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 305" font-family="system-ui" role="img" aria-label="Energetische Abkühlverläufe"><rect width="800" height="305" fill="white"/><text x="10" y="22">T / °C</text>';
  for(let i=0;i<=4;i++){
    const temp=data.T[0]+i*(data.T.at(-1)-data.T[0])/4;
    out+='<path stroke="#d1cbc2" d="M62 '+y(temp)+'H752"/><text x="6" y="'+y(temp)+'">'+Math.round(temp)+'</text><text x="'+(60+i*172)+'" y="263">'+(i*limit/4).toFixed(1)+'</text>';
  }
  curves.forEach((c,k)=>{
    let start=true,d='';
    for(const p of c){
      if(!p){start=true;continue}
      d+=(start?'M':'L')+(62+690*p[0]/limit)+' '+y(p[1]);start=false;
    }
    out+='<path fill="none" stroke="'+colors[k]+'" stroke-width="2.5" d="'+d+'"/><text x="'+(510+60*k)+'" y="24" fill="'+colors[k]+'">X'+(k+1)+'</text>';
  });
  return out+'<text x="400" y="294" text-anchor="middle">Entzogene molare Enthalpie / kJ mol⁻¹</text></svg>';
}
