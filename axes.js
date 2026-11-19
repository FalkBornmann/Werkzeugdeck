import { text, line, fmt } from './render.js';
import { elementSymbol } from './symbols.js';
export function triangleAxes(state){
 const tin=state.zoom==='tin',indices=tin?[2,0,1]:[0,1,2];
 const values=tin?[[0,0,1],[.1,0,.9],[0,.1,.9]]:[[1,0,0],[0,1,0],[0,0,1]];
 const symbol=i=>elementSymbol(state.model.components[i]),unit=state.basis==='mass'?'Masse-%':'mol-%';
 let body='';
 for(let i=0;i<=10;i++){
  const f=i/10;
  body+=text(65+345*f-12,425-360*f+4,fmt(100*((1-f)*values[0][indices[2]]+f*values[2][indices[2]]),0),11,'end');
  body+=text(410+345*f+12,65+360*f+4,fmt(100*((1-f)*values[2][indices[1]]+f*values[1][indices[1]]),0),11);
  body+=text(65+690*f,446,fmt(100*((1-f)*values[0][indices[0]]+f*values[1][indices[0]]),0),11,'middle');
 }
 const axis=(x,y,angle,component)=>'<g data-axis="'+symbol(component)+'" transform="translate('+x+' '+y+') rotate('+angle+')">'+text(0,0,symbol(component)+' / '+unit,13,'middle')+'</g>';
 body+=axis(191,218,-46,indices[2])+axis(630,218,46,indices[1])+axis(410,478,0,indices[0]);
 const corner=tin?['Sn · 100 %','10 % '+symbol(0),'10 % '+symbol(1)]:state.model.components.map(elementSymbol);
 body+=text(55,430,corner[0],14,'end')+text(765,430,corner[1],14)+text(410,50,corner[2],14,'middle');
 return body;
}
