export const systems=[
 {id:'sac',label:'Ag–Cu–Sn',kind:'ternary',family:'metal',names:'Silber Kupfer Zinn',description:'Komplexes Lotmodell mit intermetallischen Phasen und Mischkristallentmischung.',source:'https://www.metallurgy.nist.gov/phase/solder/agcusn.html',status:'Berechenbares NIST-Modell'},
 {id:'pbsnbi',label:'Bi–Pb–Sn',kind:'ternary',family:'metal',names:'Bismut Blei Zinn',description:'Übersichtlicherer ternärer Vergleich mit eutektischer Erstarrung; zusätzlich tritt ε-Pb auf.',source:'https://www.metallurgy.nist.gov/phase/solder/bipbsn.html',status:'Berechenbares NIST-Modell'},
 {id:'bisn',label:'Sn–Bi',kind:'binary',family:'metal',names:'Zinn Bismut',description:'Binäres eutektisches Vergleichssystem.',source:'https://www.metallurgy.nist.gov/phase/solder/bisn.html',status:'Berechenbares NIST-Modell'},
 {id:'cusn',label:'Sn–Cu',kind:'binary',family:'metal',names:'Zinn Kupfer',description:'Binäres System mit intermetallischen Phasen und Peritektika.',source:'https://www.metallurgy.nist.gov/phase/solder/cusn.html',status:'Berechenbares NIST-Modell'},
 {id:'salt',label:'NaCl–KCl–AlCl₃',kind:'ternary',family:'salt',names:'Natriumchlorid Kaliumchlorid Aluminiumchlorid Salz',description:'Geometrisches Modell aus Literaturisothermen mit freien Schnitten; kondensierte Phasen, vereinfachte Mengenbilanz.',source:'https://doi.org/10.1016/j.jct.2004.04.011',status:'Geometrisches Isothermenmodell'}
];
export function filterSystems({query='',kind='all',family='all',favorites=null}={}){
 const terms=query.toLocaleLowerCase('de').split(/\s+/).filter(Boolean);
 return systems.filter(s=>(kind==='all'||s.kind===kind)&&(family==='all'||s.family===family)&&
 (!favorites||favorites.includes(s.id))&&terms.every(t=>(s.label+' '+s.names+' '+s.status).toLocaleLowerCase('de').includes(t)));
}