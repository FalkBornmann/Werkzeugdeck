// Stable axes: depend on section data and explicit user range, never on the temperature cursor.
export function temperatureWindow(model,columns,mode='changes',manual){
 const full=[model.T[0],model.T.at(-1)];
 if(mode==='all')return full;
 if(mode==='manual'&&manual?.every(Number.isFinite)&&manual[1]>manual[0]){const r=[Math.max(full[0],manual[0]),Math.min(full[1],manual[1])];return r[1]>r[0]?r:full}
 const changes=[];
 for(const {series} of columns)for(let i=1;i<series.length;i++)
  if(series[i].phases&&series[i-1].phases&&series[i].signature!==series[i-1].signature)
   changes.push(series[i-1].temperature,series[i].temperature);
 if(!changes.length)return full;
 const lo=Math.min(...changes),hi=Math.max(...changes),pad=Math.max(15,(hi-lo)*.06);
 return [Math.max(full[0],Math.floor((lo-pad)/5)*5),Math.min(full[1],Math.ceil((hi+pad)/5)*5)];
}



