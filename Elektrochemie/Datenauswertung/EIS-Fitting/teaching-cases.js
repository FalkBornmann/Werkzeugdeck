/* Original educational models: illustrative values, not measured material data. */
const EIS_LESSONS = [
  {id:'interface',title:'1 · Metall / Elektrolyt',tree:['s','R',['p','R','C']],
    parameters:[['R1 R','Rₛ · Elektrolytwiderstand','Ω',10],['R2 R','Rct · Ladungstransferwiderstand','Ω',1000],['C1 C','Cdl · Doppelschichtkapazität','F',1e-5]],
    meaning:'An einer leitenden Grenzfläche können Ladungsumlagerung und eine faradaysche Reaktion parallel zur Stromantwort beitragen. Rct beschreibt hier die lokale Kleinsignalantwort am gewählten Arbeitspunkt.',
    observe:'Der ideale RC-Bogen hat die Realachsenabschnitte Rₛ und Rₛ + Rct. Größeres Cdl verschiebt seine charakteristische Frequenz nach unten: fₘ = 1/(2πRct Cdl).',
    limits:'Keine Diffusionsbegrenzung, ideale Kapazität und stationäre Grenzfläche. Rct ist ohne weitere Annahmen keine direkte Korrosionsrate.'},
  {id:'blocking',title:'2 · Ideal sperrende Beschichtung',tree:['s','R','C'],
    parameters:[['R1 R','Rₛ · Elektrolytwiderstand','Ω',10],['C1 C','Ccoat · Schichtkapazität','F',1e-9]],
    meaning:'Eine vollständig sperrende, elektrisch isolierende Schicht wird als Kondensator dargestellt. Das Modell enthält keinen Gleichstrompfad durch die Beschichtung.',
    observe:'Bei kleinen Frequenzen wächst |Z| näherungsweise mit 1/f; Nyquist zeigt eine senkrechte Linie bei Rₛ. Größeres Ccoat senkt die kapazitive Impedanz.',
    limits:'Idealer Grenzfall ohne Leckstrom oder Grenzflächenreaktion. Aus einer Kapazitätsänderung allein folgt kein Nachweis von Wasseraufnahme oder Schädigung.'},
  {id:'leaky',title:'3 · Beschichtung mit endlichem Widerstand',tree:['s','R',['p','R','C']],
    parameters:[['R1 R','Rₛ · Elektrolytwiderstand','Ω',10],['R2 R','Rcoat · Schichtwiderstand','Ω',1e6],['C1 C','Ccoat · Schichtkapazität','F',1e-9]],
    meaning:'Ein endlicher Schichtwiderstand erlaubt im Modell einen Strompfad parallel zur Schichtkapazität. Die Topologie ist dieselbe wie im ersten Fall; die physikalische Zuordnung benötigt Zusatzwissen.',
    observe:'Bei tiefen Frequenzen nähert sich der Realteil Rₛ + Rcoat. Mit Rcoat verschieben sich sowohl der Bogenumfang als auch die Zeitkonstante Rcoat Ccoat.',
    limits:'Homogene, zeitlich unveränderliche Ersatzgrößen. Die Schaltung trennt nicht zwischen unterschiedlichen Leitungswegen und beweist keine bestimmte Porenstruktur.'},
  {id:'pores',title:'4 · Durchlässige Beschichtung mit Grenzflächenreaktion',tree:['s','R',['p','C',['s','R',['p','R','C']]]],
    parameters:[['R1 R','Rₛ · Elektrolytwiderstand','Ω',10],['C1 C','Ccoat · Schichtkapazität','F',1e-9],['R2 R','Rpore · Widerstand des Elektrolytpfads','Ω',1e4],['R3 R','Rct · Ladungstransferwiderstand','Ω',1e5],['C2 C','Cdl · Doppelschichtkapazität','F',1e-5]],
    meaning:'Die Schichtkapazität liegt parallel zu einem leitenden Pfad: Rpore führt zur darunterliegenden Grenzfläche mit Rct und Cdl. Die Verschachtelung bildet diese angenommene Zugänglichkeit ab.',
    observe:'Bei tiefen Frequenzen nähert sich der Realteil Rₛ + Rpore + Rct. Änderungen von Ccoat beeinflussen vor allem den schnellen Anteil; überlappende Prozesse bleiben möglich.',
    limits:'Vereinfachter Porenpfad ohne räumliche Verteilung oder Diffusion. Zwei sichtbare Bögen sind weder zwingend noch ein eindeutiger Nachweis durchgehender Poren.'},
  {id:'film',title:'5 · Oberflächenfilm und darunterliegende Grenzfläche',tree:['s','R',['p','R','C'],['p','R','C']],
    parameters:[['R1 R','Rₛ · Elektrolytwiderstand','Ω',10],['R2 R','Rfilm · Filmwiderstand','Ω',1000],['C1 C','Cfilm · Filmkapazität','F',1e-7],['R3 R','Rct · Ladungstransferwiderstand','Ω',1e4],['C2 C','Cdl · Doppelschichtkapazität','F',1e-5]],
    meaning:'Zwei parallele RC-Gruppen in Reihe bilden zwei angenommene Beiträge ab. Ein möglicher Lehrkontext ist ein Oberflächenfilm, etwa eine Passivschicht, mit einer weiteren Grenzflächenantwort.',
    observe:'Die RC-Zeitkonstanten Rfilm Cfilm und Rct Cdl bestimmen zwei charakteristische Frequenzen. Ähnliche Zeitkonstanten lassen Bögen zusammenfallen; die Widerstände addieren sich im Tieffrequenzgrenzfall.',
    limits:'Phänomenologisches Lehrmodell, keine universelle Passivschichtschaltung. Topologie und Parameter benötigen experimentelle Begründung; ein zweiter Bogen beweist keine Passivierung.'}
];
function lessonParameters(lesson) { return Object.fromEntries(lesson.parameters.map(([key,,,value])=>[key,value])); }

function mountEISLessons() {
  const select=document.getElementById('lesson-case'), fields=document.getElementById('lesson-fields');
  let lesson, parameters;
  const escapeText=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  select.innerHTML=EIS_LESSONS.map(l=>`<option value="${l.id}">${l.title}</option>`).join('');
  function render() {
    const spectrum=predictCircuit(lesson.tree,parameters,projectionGrid(1e-3,1e8));
    const circuit=drawCircuit(lesson.tree,parameters);circuit.setAttribute('aria-label','Synthetisches Lehrmodell: '+lesson.title);
    document.getElementById('lesson-circuit').replaceChildren(circuit);
    // Reuse the model renderers; remove measurement dots from the synthetic lesson.
    const plots=document.getElementById('lesson-plots');
    plots.innerHTML=bode(spectrum,spectrum).replace('id="bode-plot"','id="lesson-bode-plot"')+nyquist([],[],spectrum.real,spectrum.imag.map(v=>-v),'lesson-nyquist-plot');
    plots.querySelectorAll('circle').forEach(node=>node.parentElement.remove());
    plots.querySelectorAll('svg').forEach(svg=>{
      const note=document.createElementNS('http://www.w3.org/2000/svg','text');
      note.setAttribute('x','87');note.setAttribute('y','14');note.setAttribute('fill','#52695f');note.textContent='Synthetisches Lehrmodell · keine Messung';svg.append(note);
    });
    document.getElementById('lesson-status').textContent='Modellkurven aktualisiert · 10⁻³ bis 10⁸ Hz · |Phase| ohne Vorzeichen.';
  }
  function choose() {
    lesson=EIS_LESSONS.find(l=>l.id===select.value);parameters=lessonParameters(lesson);
    document.getElementById('lesson-explanation').innerHTML=`<p>${lesson.meaning}</p><p><strong>Beobachten:</strong> ${lesson.observe}</p><p class="notice warn"><strong>Annahmen &amp; Grenzen:</strong> ${lesson.limits}</p>`;
    fields.innerHTML=lesson.parameters.map(([key,label,unit],i)=>`<label>${escapeText(label)} / ${unit}<input type="number" data-key="${key}" aria-label="${escapeText(label)} in ${unit}" value="${parameters[key].toExponential()}" min="1e-12" max="1e12" step="any" required><small>Im Schaltbild: ${key.split(' ')[0]}</small></label>`).join('');
    render();
  }
  fields.addEventListener('change',event=>{
    const input=event.target;if(!input.dataset.key)return;
    if(!input.checkValidity()){document.getElementById('lesson-status').textContent='Bitte einen positiven Kennwert zwischen 10⁻¹² und 10¹² eingeben. Angezeigt bleibt der letzte gültige Zustand.';return;}
    parameters[input.dataset.key]=Number(input.value);render();
  });
  select.onchange=choose;document.getElementById('lesson-reset').onclick=choose;
  document.getElementById('lesson-apply').onclick=()=>{
    if(running)return;
    useTopology(lesson.tree,'Lehrschaltbild übernommen. Lehrwerte werden nicht als Fitparameter übernommen.');
    document.getElementById('preset-controls').scrollIntoView({block:'start'});document.getElementById('preset-apply').focus({preventScroll:true});
  };
  async function save(kind,format) {
    const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
    const sources=kind==='overview'?[document.querySelector('#lesson-circuit svg'),document.getElementById('lesson-bode-plot'),document.getElementById('lesson-nyquist-plot')]:[kind==='circuit'?document.querySelector('#lesson-circuit svg'):document.getElementById('lesson-'+kind+'-plot')];
    const width=Math.max(900,...sources.map(s=>s.viewBox.baseVal.width+48));
    let y=130;
    svg.setAttribute('xmlns',ns);svg.setAttribute('font-family','Arial, sans-serif');svg.setAttribute('font-size','14');
    function text(value,at,size=16){const t=document.createElementNS(ns,'text');t.setAttribute('x','24');t.setAttribute('y',at);t.setAttribute('font-size',size);t.textContent=value;svg.append(t);}
    text(lesson.title,30,22);text('Synthetisches Lehrmodell · frei gewählte Werte · keine Messung',57);
    const labels=lesson.parameters.map(([key,label,unit])=>`${label.split(' · ')[0]} = ${parameters[key].toExponential(3)} ${unit}`);
    for(let i=0;i<labels.length;i+=3)text(labels.slice(i,i+3).join(' · '),83+22*i/3,14);
    for(const source of sources){const copy=source.cloneNode(true);copy.removeAttribute('id');copy.setAttribute('x','24');copy.setAttribute('y',y);copy.setAttribute('width',source.viewBox.baseVal.width);copy.setAttribute('height',source.viewBox.baseVal.height);svg.append(copy);y+=source.viewBox.baseVal.height+24;}
    text('Werkzeugdeck · EIS-Fitting · Modellzuordnung erfordert unabhängige Prüfung',y+10,14);
    svg.setAttribute('viewBox',`0 0 ${width} ${y+32}`);svg.setAttribute('width',width);svg.setAttribute('height',y+32);
    const bg=document.createElementNS(ns,'rect');bg.setAttribute('width','100%');bg.setAttribute('height','100%');bg.setAttribute('fill','white');svg.prepend(bg);
    const blob=new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml;charset=utf-8'}),name='EIS-Lehrmodell-'+lesson.id+'-'+kind;
    if(format==='svg'){download(blob,name+'.svg');return;}
    const url=URL.createObjectURL(blob);
    try{const image=new Image();image.src=url;await image.decode();const canvas=document.createElement('canvas');canvas.width=width*2;canvas.height=(y+32)*2;const ctx=canvas.getContext('2d');ctx.scale(2,2);ctx.drawImage(image,0,0);const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!png)throw new Error('PNG konnte nicht erzeugt werden.');download(png,name+'.png');}
    finally{URL.revokeObjectURL(url);}
  }
  WDExports.mount({anchor:document.getElementById('lesson-export'),defaultItem:'overview',items:[['overview','Lehrmodell · Gesamtübersicht'],['bode','Lehrmodell · Bode'],['nyquist','Lehrmodell · Nyquist'],['circuit','Lehrmodell · Schaltbild']].map(([id,label])=>({id,label,save:format=>save(id,format)}))});
  choose();
}
