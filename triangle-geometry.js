// Shared equilateral composition plane for the 2D chart and 3D liquidus surface.
export const triangleLayout = Object.freeze({left:65, top:65, width:690,
 height:690*Math.sqrt(3)/2, bottom:65+690*Math.sqrt(3)/2});
export function ternaryPlanePoint(v){return [v[1]+v[2]/2,v[2]*Math.sqrt(3)/2]}
export function triangleDisplayPoint(v){
 const [u,w]=ternaryPlanePoint(v),{left,width,bottom}=triangleLayout;
 return [left+width*u,bottom-width*w];
}
export function triangleDisplayInverse(px,py){
 const {left,width,height,bottom}=triangleLayout;
 const c=(bottom-py)/height,b=(px-left)/width-c/2;
 return [1-b-c,b,c];
}
