const symbols = {
  AG: 'Ag', AL: 'Al', AU: 'Au', BI: 'Bi', C: 'C', CA: 'Ca', CL: 'Cl',
  CO: 'Co', CR: 'Cr', CU: 'Cu', FE: 'Fe', GE: 'Ge', H: 'H', K: 'K',
  LI: 'Li', MG: 'Mg', MN: 'Mn', MO: 'Mo', N: 'N', NA: 'Na', NB: 'Nb',
  NI: 'Ni', O: 'O', P: 'P', PB: 'Pb', S: 'S', SB: 'Sb', SI: 'Si',
  SN: 'Sn', TI: 'Ti', V: 'V', W: 'W', ZN: 'Zn', ZR: 'Zr',
};
export function elementSymbol(identifier) {
  return symbols[identifier] || identifier;
}
