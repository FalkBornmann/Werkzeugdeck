import {toMoles} from './equilibrium.js';
// Published NIST invariant liquid compositions, in mass fractions. Reference markers are not fitted observations.
const tables={
 alsi:[['E','E',577,[.874,.126],'L → α-Al + Si · Literatur-Näherungswert']],
 alcu:[['E','E',548,[.67,.33],'L → α-Al + θ-Al₂Cu · Literatur-Näherungswert']],
 cuni:[],

 agcu:[['E','E',779.1,[.7159,.2841],'L → (Ag) + (Cu)']],
 agsn:[
 ['E','E',220.3,[.0373,.9627],'L → Ag₃Sn + β-Sn'],
 ['P₁','P',479.9,[.4879,.5121],'L + ζ-Ag → Ag₃Sn'],
 ['P₂','P',723.7,[.773,.227],'L + (Ag) → ζ-Ag']],
 pbsn:[['E','E',182.2,[.3787,.6213],'L → α-Pb + β-Sn']],
 bipb:[['E','E',125.9,[.5551,.4449],'L → ε-Pb + Bi'],['P','P',185,[.3607,.6393],'L + α-Pb → ε-Pb']],
 bisn:[['E','E',138.8,[.4303,.5697],'L → β-Sn + Bi']],
 cusn:[['E','E',226.8,[.9911,.0089],'L → β-Sn + Cu₆Sn₅'],['P','P',415,[.8693,.1307],'L + Cu₃Sn → Cu₆Sn₅']],
 agbisn:[
 ['E₁','E',137.1,[.0068,.5585,.4347],'L → Ag₃Sn + Bi + β-Sn'],
 ['E₂','E',251.9,[.0138,.9439,.0423],'L → ζ-Ag + Ag₃Sn + Bi'],
 ['E₃','E',263.4,[.0189,.9779,.0032],'L → (Ag) + ζ-Ag + Bi']],
 bicusn:[
 ['E₁','E',138.8,[.569,.0001,.4309],'L → Cu₆Sn₅ + β-Sn + Bi'],
 ['U₁','U',195.9,[.781,.0003,.2187],'L + Cu₃Sn → Cu₆Sn₅ + Bi'],
 ['U₂','U',270.3,[.9982,.0013,.0005],'L + (Cu) → Cu₄₁Sn₁₁ + Bi']],

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
export function reactionReferences(model){if(model.diagramModel)return model.diagram.references;return (tables[model.system]||tables[model.key]|| (tables[{'AG,CU,SN':'sac','BI,PB,SN':'pbsnbi'}[model.components.join(',')]]||[])).map(([label,kind,t,mass,reaction])=>({label,kind,t,x:toMoles(mass,model.masses),reaction}))}