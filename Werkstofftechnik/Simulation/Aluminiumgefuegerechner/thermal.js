// Sensitivity profiles anchored to the unchanged tabulated reference values.
// These normalized laws and h(T) shapes are assumptions, not measured medium curves.
export function thermalProperties(m,T){const z=Math.max(0,Math.min(1,(T-20)/880));return {k:m.k*(m.variableProperties?1-.30*z:1),cp:m.cp*(m.variableProperties?1+.25*z:1)};}
export function heatTransfer(h,T,bath,medium='constant'){if(medium==='constant'||T<=bath)return h;const excess=T-bath;if(medium==='air')return h;if(!['oil','water'].includes(medium))return h;const film=medium==='water'?500:450,boil=medium==='water'?200:160;const factor=excess>film? .35:excess>boil? .35+1.65*(film-excess)/(film-boil):excess>70? .5+1.5*(excess-70)/(boil-70):.5;return h*factor;}
// Implicit finite volumes in half-slab / infinite cylinder, one symmetric boundary.
export function mesh(size,shape,n=32){const R=size/2000,dx=R/n;return Array.from({length:n},(_,i)=>({x:(i+.5)*dx,volume:shape==='rod'?((i+1)**2-i**2)*dx*dx/2:dx,left:shape==='rod'?i*dx:1,right:shape==='rod'?(i+1)*dx:1,dx}));}
export function heatStep(old,grid,m,bath,h,dt){
 const n=old.length,lo=[],di=[],up=[],rhs=[];
 const props=old.map(T=>thermalProperties(m,T));
 for(let i=0;i<n;i++){const g=grid[i],cap=m.rho*props[i].cp*g.volume/dt,ki=props[i].k,kl=i?2*ki*props[i-1].k/(ki+props[i-1].k):ki,kr=i<n-1?2*ki*props[i+1].k/(ki+props[i+1].k):ki;
 const L=i?kl*g.left/g.dx:0,U=i<n-1?kr*g.right/g.dx:g.right/(1/heatTransfer(h,old[i],bath,m.medium)+g.dx/(2*ki));lo[i]=-L;up[i]=i<n-1?-U:0;di[i]=cap+L+U;rhs[i]=cap*old[i]+(i===n-1?U*bath:0);}

 for(let i=1;i<n;i++){const f=lo[i]/di[i-1];di[i]-=f*up[i-1];rhs[i]-=f*rhs[i-1];}const out=new Array(n);out[n-1]=rhs[n-1]/di[n-1];for(let i=n-2;i>=0;i--)out[i]=(rhs[i]-up[i]*out[i+1])/di[i];return out;
}

// Symmetric quarter of a rectangle; all four external faces convect identically.
export function rectangleMesh(width,height,nx=20,ny=20){const dx=width/2000/nx,dy=height/2000/ny;return Array.from({length:nx*ny},(_,i)=>{const ix=i%nx,iy=Math.floor(i/nx);return {ix,iy,x:(ix+.5)*dx,y:(iy+.5)*dy,dx,dy,volume:dx*dy};});}
export function heatStep2D(old,grid,m,bath,h,dt,nx,ny){const xgrid=mesh(nx*grid[0].dx*2000,'plate',nx),ygrid=mesh(ny*grid[0].dy*2000,'plate',ny);const half=new Array(old.length),out=new Array(old.length);
 for(let iy=0;iy<ny;iy++){const row=heatStep(old.slice(iy*nx,(iy+1)*nx),xgrid,m,bath,h,dt);for(let ix=0;ix<nx;ix++)half[iy*nx+ix]=row[ix];}
 for(let ix=0;ix<nx;ix++){const col=heatStep(Array.from({length:ny},(_,iy)=>half[iy*nx+ix]),ygrid,m,bath,h,dt);for(let iy=0;iy<ny;iy++)out[iy*nx+ix]=col[iy];}return out;
}
