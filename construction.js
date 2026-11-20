import {svg,text,line,trianglePoint,escape,fmt,pointColors,phaseColor} from './render.js';
import {elementSymbol} from './symbols.js';
import {solidificationHistory} from './solidification.js';
export function constructionChart(state){
 if(state.current?.unavailable)return svg(text(40,90,'Keine Bilanzkonstruktion außerhalb des belegten Isothermenbereichs.',17),900,210);
 const phases=state.current.phases,history=solidificationHistory(state);
 let body=text(40,27,'Vom Phasendiagramm zur Mengenbilanz',19);
 body+=text(40,51,'Phasenzusammensetzungen und Gesamtgehalt bei '+fmt(state.model.T[state.ti])+' °C',12);
 const point=x=>state.binary?[70+520*x[0],225]:[70+520*(x[1]+x[2]*.5),355-270*x[2]];
 const originalPoint=point;
 const raw=phases.map(q=>originalPoint(q.x)),extent=Math.max(...raw.map(q=>q[0]))-Math.min(...raw.map(q=>q[0])),height=Math.max(...raw.map(q=>q[1]))-Math.min(...raw.map(q=>q[1]));
 const zoomed=phases.length>1&&Math.max(extent,height)<160;
 const cx=(Math.max(...raw.map(q=>q[0]))+Math.min(...raw.map(q=>q[0])))/2,cy=(Math.max(...raw.map(q=>q[1]))+Math.min(...raw.map(q=>q[1])))/2;
 const scale=zoomed?Math.min(440/Math.max(1,extent),230/Math.max(1,height)):1;
 const projected=x=>{const p=originalPoint(x);return zoomed?[330+(p[0]-cx)*scale,220+(p[1]-cy)*scale]:p};
 const corners=state.model.components.map((_,i)=>point(state.model.components.map((_,j)=>i===j?1:0)));
 if(!zoomed&&state.binary)body+=line(...corners[0],...corners[1],'#706354',2);
 else if(!zoomed)body+='<path d="'+corners.map((p,i)=>(i?'L':'M')+p.join(' ')).join('')+'Z" fill="#faf6ef" stroke="#706354"/>';
 if(!zoomed)corners.forEach((p,i)=>body+=text(p[0],p[1]+23,elementSymbol(state.model.components[i]),14,'middle'));
 const p=phases.map(q=>projected(q.x)),c=projected(state.points[state.selected]);
 if(p.length===3){
  p.forEach((a,i)=>{const b=p[(i+1)%3];body+='<path data-lever-area d="M'+c.join(' ')+'L'+a.join(' ')+'L'+b.join(' ')+'Z" fill="'+phaseColor(phases[(i+2)%3].name)+'" fill-opacity=".22"/>'});
 }
 if(p.length>1)p.forEach((a,i)=>body+=line(...a,...p[(i+1)%p.length],'#514231',2));
 p.forEach((a,i)=>{body+=line(...c,...a,'#8f7e6b',1,'4 3')+'<circle cx="'+a[0]+'" cy="'+a[1]+'" r="5" fill="'+phaseColor(phases[i].name)+'"/>'+text(a[0]+7,a[1]-8,phases[i].name,12)});
 body+='<circle data-total-composition cx="'+c[0]+'" cy="'+c[1]+'" r="6" fill="'+pointColors[state.selected]+'" stroke="white" stroke-width="2"/>'+text(c[0]+8,c[1]+18,state.labels[state.selected],13);
 body+=text(620,85,'Bilanz: x₀ = Σ fᵢ xᵢ',16)+text(620,111,'Σ fᵢ = 1 · fᵢ ≥ 0',14);
 phases.forEach((q,i)=>{const y=149+i*43;body+=text(620,y,q.name,13)+text(865,y,fmt((state.basis==='mass'?q.mass:q.fraction)*100)+' %',13,'end')});
 body+=text(40,412,zoomed?'Vergrößerter Ausschnitt der Zusammensetzungsebene · fᵢ aus der vollständigen Bilanz':state.binary?'Hebelgesetz entlang der Konode':'Baryzentrische Bilanz im Konodendreieck; Teilflächen zeigen molare Gewichte.',12);
 body+=text(40,436,'Massenwerte werden aus den molaren Phasenmengen und Phasenzusammensetzungen umgerechnet.',11);
 return svg(body,900,460,'Geometrische Phasenbilanz mit Konoden und Phasenzusammensetzungen');
}