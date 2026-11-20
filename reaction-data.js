import {toMoles} from './equilibrium.js';
// Published NIST invariant liquid compositions, in mass fractions. Reference markers are not fitted observations.
const tables={
 sac:[
 ['E₁','E',215.9,[.0373,.0085,.9542],'L → Ag₃Sn + Cu₆Sn₅ + β-Sn'],
 ['U₁','U',356.2,[.1926,.0586,.7488],'L + Cu₃Sn → Ag₃Sn + Cu₆Sn₅'],
 ['U₂','U',459,[.3877,.0854,.5269],'L + ζ-Ag → Ag₃Sn + Cu₃Sn'],
 ['U₃','U',574.4,[.5346,.1307,.3347],'L + (Ag) → ζ-Ag + Cu₃Sn'],
 ['P₁','P',611,[.5017,.2206,.2777],'L + (Ag) + Cu₁₀Sn₃ → Cu₃Sn'],
 ['P₂','P',612.6,[.4964,.2285,.2751],'L + (Ag) + γ → Cu₁₀Sn₃'],
 ['U₄','U',636.4,[.4442,.3217,.2341],'L + (Cu) → (Ag) + γ'],
 ['U₅','U',641.6,[.4011,.3576,.2413],'L + β → (Cu) + γ']
 ],
 pbsnbi:[
 ['E₁','E',98,[.5159,.3259,.1582],'L → β-Sn + ε-Pb + Bi'],
 ['U₁','U',135.7,[.3054,.4756,.2190],'L + (Pb) → β-Sn + ε-Pb']
 ]
};
export function reactionReferences(model){if(model.diagramModel)return model.diagram.references;return (tables[model.system]||tables[model.key]|| (model.components[0]==='AG'?tables.sac:model.components[0]==='BI'&&model.components.length===3?tables.pbsnbi:[])).map(([label,kind,t,mass,reaction])=>({label,kind,t,x:toMoles(mass,model.masses),reaction}))}