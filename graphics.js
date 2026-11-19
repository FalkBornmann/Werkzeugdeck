export const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const fmt=(n,d=1)=>n===null||!Number.isFinite(n)?'–':n.toLocaleString('de-DE',{maximumFractionDigits:d});
const text=(x,y,value,size=15,color='#403445',weight=400)=>`<text x="${x}" y="${y}" fill="${color}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}">${escape(value)}</text>`;
const root=(title,body,height=650)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 ${height}" width="1000" height="${height}" role="img" aria-label="${escape(title)}"><title>${escape(title)}</title><rect width="1000" height="${height}" fill="#fbfaf8"/>${body}</svg>`;
export function sceneSVG(p,r,view={mode:'3d',yaw:-32,elevation:24}){
 const W=p.width,D=p.depth,H=p.height;
 const angle=(view.mode==='side'?-90:view.mode==='top'?0:view.yaw)*Math.PI/180;
 const el=(view.mode==='top'?89.9:view.mode==='side'?0:view.elevation)*Math.PI/180;
 const raw=([x,y,z])=>{const a=(x-W/2)*Math.cos(angle)-(y-D/2)*Math.sin(angle),b=(x-W/2)*Math.sin(angle)+(y-D/2)*Math.cos(angle);return [a,-b*Math.sin(el)-(z-H/2)*Math.cos(el),-b*Math.cos(el)+(z-H/2)*Math.sin(el)];};
 const bounds=[];for(const x of [0,W])for(const y of [0,D+.5])for(const z of [0,H])bounds.push(raw([x,y,z]));
 const minX=Math.min(...bounds.map(a=>a[0])),maxX=Math.max(...bounds.map(a=>a[0])),minY=Math.min(...bounds.map(a=>a[1])),maxY=Math.max(...bounds.map(a=>a[1]));
 const scale=Math.min(840/Math.max(.1,maxX-minX),405/Math.max(.1,maxY-minY));
 const point=v=>{const q=raw(v);return [500+(q[0]-(minX+maxX)/2)*scale,292+(q[1]-(minY+maxY)/2)*scale,q[2]];};
 const polygon=(vertices,color,opacity=1,stroke='#776a7e')=>`<polygon points="${vertices.map(v=>point(v).slice(0,2).join(',')).join(' ')}" fill="${color}" fill-opacity="${opacity}" stroke="${stroke}" stroke-width="1.2"/>`;
 const compact=!!view.compact;
 let s=text(25,compact?44:32,p.name,compact?38:23,'#4a3455',700)+text(25,compact?84:58,`Innenraum ${fmt(W,2)} × ${fmt(D,2)} × ${fmt(H,2)} m · Werkstück ${p.orientation==='horizontal'?'horizontal':'vertikal'}`,compact?26:15);
 s+=polygon([[0,0,0],[W,0,0],[W,D,0],[0,D,0]],'#e8dfd1');
 if(view.mode!=='top')s+=polygon([[0,D,0],[W,D,0],[W,D,H],[0,D,H]],'#e9e2ed',.3)+polygon([[0,0,0],[0,D,0],[0,D,H],[0,0,H]],'#e9e2ed',.13)+polygon([[W,0,0],[W,D,0],[W,D,H],[W,0,H]],'#e9e2ed',.13);
 const faces=[];
 function box(x,y,z,w,d,h,color,opacity=1){
  const a=[x,y,z],b=[x+w,y,z],c=[x+w,y+d,z],e=[x,y+d,z],f=[x,y,z+h],g=[x+w,y,z+h],i=[x+w,y+d,z+h],j=[x,y+d,z+h];
  for(const vs of [[a,b,c,e],[a,b,g,f],[b,c,i,g],[c,e,j,i],[e,a,f,j],[f,g,i,j]])faces.push({vs,color,opacity,depth:vs.reduce((v,q)=>v+raw(q)[2],0)/4});
 }
 const wallX=(W-p.wallWidth)/2;
 if(p.type==='water'){
  box(wallX,D-.18,.16+p.slotHeight,p.wallWidth,.09,p.wallHeight,'#65b9be',.85);
  box(wallX,D-.18,.16,p.wallWidth,.08,p.slotHeight,'#352d43',.9);
  box(wallX-.05,D-.5,.02,p.wallWidth+.1,.65,.12,'#61a9bb',.8);
  box(wallX,D-.05,.15,p.wallWidth,.38,Math.min(H-.2,p.wallHeight+p.slotHeight),'#b8aec1',.22);
 }else if(p.type==='dry'){
  box(wallX,D-.2,.25,p.wallWidth,.15,p.wallHeight,'#bcad88',.95);
  for(let x=0;x<10;x++)box(wallX+x*p.wallWidth/10,D-.215,.25,.012,.015,p.wallHeight,'#8f815f');
  box(wallX,D-.05,.2,p.wallWidth,.35,p.wallHeight+.1,'#b8aec1',.25);
 }else{
  box((W-p.floorWidth)/2,(D-p.floorDepth)/2,.015,p.floorWidth,p.floorDepth,.035,'#baad84');
  for(let i=1;i<10;i++)box((W-p.floorWidth)/2+i*p.floorWidth/10,(D-p.floorDepth)/2,.052,.008,p.floorDepth,.01,'#81775b');
  box(.05,.05,H-.08,W-.1,D-.1,.04,'#9fcbdc',.45);
 }
 const py=D-p.distance, pd=p.orientation==='horizontal'?p.pieceHeight:p.pieceDepth,ph=p.orientation==='horizontal'?p.pieceDepth:p.pieceHeight;
 const px=(W-p.pieceWidth)/2;
 if(p.pieceZ>.05){box(W/2-.025,py-.025,0,.05,.05,p.pieceZ,'#77697b');box(px,py-pd/2,p.pieceZ-.03,p.pieceWidth,Math.max(.08,pd),.03,'#756779');}
 box(px,py-pd/2,p.pieceZ,p.pieceWidth,pd,Math.max(.005,ph),'#dcac61');
 const source=p.orientation==='horizontal'?[W/2,py,p.pieceZ+.32]:[W/2,py-.35,p.pieceZ+ph*.55];
 box(source[0]-.035,source[1]-.06,source[2],.07,.12,.07,'#55475e');
 if(p.type==='bls')box(.03,source[1]-.025,source[2]+.12,W-.06,.05,.04,'#8b8292');
 else{const personY=Math.max(.16,py-.75);box(W/2-.13,personY-.08,.06,.26,.16,.85,'#7d8790',.6);box(W/2-.09,personY-.06,.94,.18,.14,.18,'#7d8790',.6);}
 for(const face of faces.sort((a,b)=>a.depth-b.depth))s+=polygon(face.vs,face.color,face.opacity);
 const line=(a,b,color,width=3,dash='')=>{const x=point(a),y=point(b);return `<line x1="${x[0]}" y1="${x[1]}" x2="${y[0]}" y2="${y[1]}" stroke="${color}" stroke-width="${width}" ${dash?'stroke-dasharray="'+dash+'"':''}/>`;};
 // A complete wireframe keeps the booth readable, including its transparent front.
 for(const x of [0,W])for(const y of [0,D])s+=line([x,y,0],[x,y,H],'#b7aabd',1.2);
 s+=line([0,0,H],[W,0,H],'#b7aabd',1.2)+line([0,D,H],[W,D,H],'#b7aabd',1.2)+line([0,0,H],[0,D,H],'#b7aabd',1.2)+line([W,0,H],[W,D,H],'#b7aabd',1.2);
 const arrow=(pts,color)=>{const ps=pts.map(point);const a=ps.at(-2),b=ps.at(-1),t=Math.atan2(b[1]-a[1],b[0]-a[0]);const h=10;return `<polyline points="${ps.map(v=>v.slice(0,2).join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="3.5"/><polygon points="${b[0]},${b[1]} ${b[0]-h*Math.cos(t-.45)},${b[1]-h*Math.sin(t-.45)} ${b[0]-h*Math.cos(t+.45)},${b[1]-h*Math.sin(t+.45)}" fill="${color}"/>`;};
 if(p.type==='bls'){
  for(const f of [.22,.78])s+=arrow([[W*f,D*.2,H*.88],[W*f,D*.45,H*.58]],'#24749a')+arrow([[W*f,D*.5,H*.48],[W*f,D*.55,.1]],'#b44a2c');
  s+=arrow([[W*.5,D*.8,.05],[W*.5,D+.3,.05]],'#77508c');
 }else{
  for(const f of [.2,.8]){
   const x=W/2+(f-.5)*Math.min(p.wallWidth,W*.7);
   s+=arrow([[x,.08,H*.65],[x,Math.max(.3,py-.25),H*.55]],'#24749a');
   const z=p.type==='water'?.16+p.slotHeight/2:.25+p.wallHeight*.45;
   s+=arrow([[x,Math.max(.3,py),Math.min(H*.55,.25+p.wallHeight*.7)],[x,D-.35,z],[x,D-.08,z]],'#b44a2c');
  }
  s+=arrow([[W/2,D+.02,H*.45],[W/2,D+.35,H*.7]],'#77508c');
  if(p.type==='water')for(const f of [.25,.75])s+=arrow([[wallX+p.wallWidth*f,D-.2,.16+p.slotHeight+p.wallHeight*.85],[wallX+p.wallWidth*f,D-.2,.16+p.slotHeight+.04]],'#369da4');
 }
 // Spray cone is schematic and deliberately does not claim particle trajectories.
 const src=point(source),target=point([W/2,py,p.pieceZ+ph*.5]);
 s+=`<line x1="${src[0]}" y1="${src[1]}" x2="${target[0]}" y2="${target[1]}" stroke="#d5a45d" stroke-width="12" stroke-opacity=".45"/>`;
 if(compact){
 s+=`<rect x="20" y="510" width="960" height="370" rx="10" fill="#f0eaf3"/>`;
 const lines=[`Arbeitsquerschnitt: ${fmt(r.areaWork,3)} m²`,`Mittlere Modellgeschwindigkeit: ${fmt(r.speedWork,2)} m/s`,`${p.type==='water'?'Unterer Spalt':p.type==='dry'?'Aktive Filterfront':'Bodenfilter'}: ${fmt(r.areaInlet,3)} m²`,`Mittlere Eintrittsgeschwindigkeit: ${fmt(r.speedInlet,2)} m/s`,`Volumenstrom: ${fmt(p.flow,0)} m³/h`,'Werkstück / Substrat: sandfarben','Werkzeugdeck · stationäres Lehrmodell','Luftwege schematisch · keine Anlagenfreigabe'];
 lines.forEach((line,i)=>s+=text(38,550+i*42,line,i<5?31:27,'#4a3455',i===0?700:400));
 }else{
 s+=`<rect x="20" y="510" width="960" height="120" rx="10" fill="#f0eaf3"/>`;
 s+=text(38,538,`Arbeitsquerschnitt: ${fmt(r.areaWork,3)} m² · mittlere Modellgeschwindigkeit: ${fmt(r.speedWork,2)} m/s`,17,'#4a3455',700);
 s+=text(38,565,`${p.type==='water'?'Unterer Spalt':p.type==='dry'?'Aktive Filterfront':'Bodenfilter'}: ${fmt(r.areaInlet,3)} m² · mittlere Eintrittsgeschwindigkeit: ${fmt(r.speedInlet,2)} m/s`,17);
 s+=text(38,593,`Vergleichsvolumenstrom: ${fmt(p.flow,0)} m³/h · Werkstück / Substrat: sandfarben`,16);
 s+=text(38,616,'Werkzeugdeck · stationäres Lehrmodell · Luftwege schematisch, keine CFD oder Anlagenfreigabe',13);
 }

 return root('Kabinenmodell mit Werkstück, Zuluft, belasteter Luft und Absaugöffnung',s,compact?910:650);
}
export function comparisonSVG(p,r,compact=false){
 const rows=[['Eingestellter Vergleichsvolumenstrom',p.flow,'#4a3455'],['Arbeitsquerschnitt × Zielgeschwindigkeit',r.qGeometry,'#24749a'],['AGW · idealer Modellbedarf',r.qHealth,'#9b743d'],['UEG · idealer Modellbedarf',r.qEx,'#b44a2c']];
 if(r.reference)rows.push(['BLS · Hersteller-Mindestwert',r.reference.min,'#677163'],['BLS · Herstellerempfehlung',r.reference.recommended,'#8a7499']);
 const max=Math.max(1,...rows.map(a=>a[1]||0));let s=text(25,compact?45:32,'Volumenströme · m³/h',compact?38:23,'#4a3455',700);
 rows.forEach(([name,value,color],i)=>{const y=(compact?100:74)+i*(compact?95:65);s+=text(25,y,name,compact?28:15);if(value!==null)s+=`<rect x="25" y="${y+9}" width="${760*value/max}" height="17" rx="3" fill="${color}"/>`+text(805,y+24,fmt(value,0),compact?28:16,color,700);else s+=text(25,y+28,'Stoffdaten fehlen · nicht bewertet',compact?27:14,'#766677');});
 const h=rows.length*(compact?95:65)+(compact?180:115);
 if(compact)s+=text(25,h-90,'Modellwerte und Herstellerreferenz getrennt prüfen.',27)+text(25,h-50,'Stationäre Bilanz · keine Aussage zur örtlichen Erfassung',25);
 else s+=text(25,h-35,'Keine Addition der Kriterien. Modellwerte und Herstellerreferenz getrennt prüfen.',14)+text(25,h-14,'Werkzeugdeck · idealisierte stationäre Bilanz · keine Aussage zur örtlichen Erfassung',12);
 return root('Vergleich der Abluftvolumenströme in Kubikmetern pro Stunde',s,h);
}
