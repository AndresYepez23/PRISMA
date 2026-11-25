// Unit choices shared by the app modal and the standalone workbench.
export const unitChoices={
 length:[['m','Metros','Meters'],['km','Kilómetros','Kilometers'],['cm','Centímetros','Centimeters'],['mm','Milímetros','Millimeters'],['mi','Millas','Miles'],['ft','Pies','Feet'],['in','Pulgadas','Inches'],['yd','Yardas','Yards']],
 mass:[['kg','Kilogramos','Kilograms'],['g','Gramos','Grams'],['mg','Miligramos','Milligrams'],['lb','Libras','Pounds'],['oz','Onzas','Ounces'],['t','Toneladas','Tonnes']],
 area:[['m2','m²'],['km2','km²'],['cm2','cm²'],['ha','Hectáreas','Hectares'],['acre','Acres'],['ft2','Pies²','Feet²']],
 volume:[['l','Litros','Liters'],['ml','Mililitros','Milliliters'],['m3','m³'],['gal','Galones US','US gallons'],['cup','Tazas US','US cups']],
 speed:[['ms','m/s'],['kmh','km/h'],['mph','mph'],['kn','Nudos','Knots']],
 data:[['B','Bytes'],['KB','Kilobytes'],['MB','Megabytes'],['GB','Gigabytes'],['TB','Terabytes']],
 temperature:[['C','Celsius'],['F','Fahrenheit'],['K','Kelvin']]
};
export function updateUnitInputs(root,language='es'){
 const kind=root.querySelector('[name=kind]').value,choices=unitChoices[kind];
 for(const [index,name] of ['from','to'].entries()){
  const input=root.querySelector('[name='+name+']');input.replaceChildren(...choices.map(([value,es,en])=>new Option(language==='en'?en||es:es,value)));
  input.value=choices[Math.min(index,choices.length-1)][0];
 }
}
