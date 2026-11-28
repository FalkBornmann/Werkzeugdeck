const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context=vm.createContext({});
vm.runInContext(fs.readFileSync(__dirname+'/projection.js','utf8')+fs.readFileSync(__dirname+'/teaching-cases.js','utf8')+';globalThis.lessons=EIS_LESSONS;globalThis.params=lessonParameters;',context);
test('five distinct teaching cases produce passive finite spectra and independent defaults',()=>{
  assert.equal(context.lessons.length,5);assert.equal(new Set(context.lessons.map(l=>l.id)).size,5);
  for(const lesson of context.lessons){const p=context.params(lesson),original={...p},f=context.projectionGrid(.001,1e8),z=context.predictCircuit(lesson.tree,p,f);
    assert.equal(z.f.length,401);assert(z.real.every(x=>Number.isFinite(x)&&x>0));assert(z.imag.every(x=>Number.isFinite(x)&&x<0));
    const key=lesson.parameters[0][0];p[key]*=2;const varied=context.predictCircuit(lesson.tree,p,f);
    assert(Math.abs(varied.real[0]-z.real[0]-original[key])<1e-6);assert.deepEqual({...context.params(lesson)},original);
  }
});
test('analytic interface and coating limits match educational claims',()=>{
  const [metal,blocking,leaky,pores,film]=context.lessons;
  for(const [lesson,dc] of [[metal,1010],[leaky,1000010],[pores,110010],[film,11010]]){
    const p=context.params(lesson),z=context.predictCircuit(lesson.tree,p,[1e-12,1e12]);assert(Math.abs(z.real[0]-dc)/dc<1e-9);assert(Math.abs(z.real[1]-10)<1e-6);
  }
  const p=context.params(blocking),z=context.predictCircuit(blocking.tree,p,[1,10]);assert.equal(z.real[0],10);assert(Math.abs(z.imag[0]/z.imag[1]-10)<1e-12);
  const p2=context.params(metal),f=1/(2*Math.PI*p2['R2 R']*p2['C1 C']),z2=context.predictCircuit(metal.tree,p2,[f]);assert(Math.abs(z2.real[0]-510)<1e-9);assert(Math.abs(z2.imag[0]+500)<1e-9);
});
