// Curated factual data. No network requests at runtime; checked 2026-11-19.
export const checked='2026-11-19';
export const agwSource={title:'TRGS 900, Fassung 05.06.2026, Tabelle 3',url:'https://gewerbeaufsicht.baden-wuerttemberg.de/documents/20121/56990/5_900.pdf'};
const m054={title:'BG RCI · DGUV 213-081 / M054, Januar 2025',url:'https://res.jedermann.de/data/downloads/M054_Gesamtdokument.pdf'};
const etem={title:'BG ETEM · S248, Tabelle sicherheitstechnischer Kennzahlen',url:'https://medien.bgetem.de/medienportal/artikel/U1owMTk-/s248-gefa2560ehrdungsbeurteilung-explosionsrisiken.pdf/@@download/file'};
const gis=(file,name)=>({title:'GisChem · '+name+', Datenblatt Seite 1',url:'https://ssl.gischem.de/download/'+file+'.PDF'});
export const substances=[
 {id:'acetone',name:'Aceton',cas:'67-64-1',agw:1200,ppm:500,ueg:60,peakFactor:2,peakCategory:'I',remarks:'AGS, DFG, EU, Y',agwPage:17,uegSource:{...m054,page:64}},
 {id:'ethanol',name:'Ethanol',cas:'64-17-5',agw:380,ppm:200,ueg:59,peakFactor:4,peakCategory:'II',remarks:'DFG, Y',agwPage:29,uegSource:{...etem,page:11}},
 {id:'isopropanol',name:'2-Propanol / Isopropanol',cas:'67-63-0',agw:500,ppm:200,ueg:50,peakFactor:2,peakCategory:'II',remarks:'DFG, Y',agwPage:44,uegSource:gis('01_0-000067-63-0-000000_1_1_88','Isopropanol')},
 {id:'ethyl-acetate',name:'Ethylacetat',cas:'141-78-6',agw:730,ppm:200,ueg:73,peakFactor:2,peakCategory:'I',remarks:'DFG, EU, Y',agwPage:30,uegSource:gis('01_0-000141-78-6-000000_1_1_552','Ethylacetat')},
 {id:'butyl-acetate',name:'n-Butylacetat',cas:'123-86-4',agw:300,ppm:62,ueg:58,peakFactor:2,peakCategory:'I',remarks:'AGS, Y, EU',agwPage:21,uegSource:{...m054,page:66}},
 {id:'butanone',name:'Butanon / MEK',cas:'78-93-3',agw:600,ppm:200,ueg:45,peakFactor:1,peakCategory:'I',remarks:'DFG, EU, H, Y',agwPage:21,uegSource:gis('01_0-000078-93-3-000000_7_1_2169','Butanon')}
];
export function verifiedPreset(s){return substances.find(x=>x.id===s.substanceId&&x.name===s.name&&x.agw===s.agw&&x.ueg===s.ueg)||null;}
