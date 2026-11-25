// Public UI states contain no file contents, model identifiers or provider errors.
const phases={
 'ocr-engine':['Cargando el motor OCR…','Loading the OCR engine…'],
 'ocr-language':['Cargando los datos de idioma…','Loading language data…'],
 'ocr-initialize':['Preparando el reconocimiento…','Preparing text recognition…'],
 'ocr-recognize':['Reconociendo texto…','Recognizing text…'],
 'local-model':['Cargando el modelo en tu dispositivo…','Loading the model on your device…'],
 'background-finish':['Afinando los bordes…','Finishing the edges…'],
 'background-remove':['Separando el objeto del fondo…','Separating the subject from the background…'],
 'image-classify':['Reconociendo categorías visuales…','Recognizing image categories…']
};
export function toolProgress(value,message,detail,language='es'){
 const en=language==='en',phase=phases[detail?.phase];
 const fraction=Number.isFinite(detail?.fraction)?Math.max(0,Math.min(1,detail.fraction)):null;
 if(phase)return {text:phase[en?1:0]+(fraction===null?'':' '+Math.round(fraction*100)+'%'),fraction};
 const percent=Number.isFinite(value)?Math.max(0,Math.min(1,value)):null;
 return {text:en?'Processing…'+(percent===null?'':' '+Math.round(percent*100)+'%'):(message||'Procesando…'),fraction:percent};
}
export function toolFailure(error,language='es',online=true){
 const en=language==='en';
 if(error?.code==='OCR_NO_TEXT')return {retry:false,text:en?'No text was detected. Check the selected language and choose a sharper image with larger, readable text.':'No se detectó texto. Comprueba el idioma seleccionado y elige una imagen más nítida con texto grande y legible.'};
 const backgroundErrors={
  'inference-failed':['El modelo no pudo procesar esta imagen. Prueba una copia más pequeña o una fotografía distinta.','The model could not process this image. Try a smaller copy or another photograph.'],
  'unsupported-image':['Usa una imagen JPG, PNG o WebP.','Use a JPG, PNG or WebP image.'],
  'image-too-large':['La imagen supera el límite de 40 MB. Elige una copia más pequeña.','The image exceeds the 40 MB limit. Choose a smaller copy.'],
  'decode-failed':['No se pudo leer la imagen. Elige otra copia JPG, PNG o WebP.','Could not read the image. Choose another JPG, PNG or WebP copy.'],
  'out-of-memory':['Falta memoria para procesar la imagen. Prueba una copia más pequeña o un dispositivo con más memoria.','There is not enough memory to process the image. Try a smaller copy or a device with more memory.']
 };
 if(backgroundErrors[error?.code])return {retry:false,text:backgroundErrors[error.code][en?1:0]};
 const libraryFailure=/dynamically imported module|importing a module/i.test(String(error?.cause?.message||error?.message||''));
 if(libraryFailure)return {retry:false,reload:true,text:en?'The tool library could not load. Check your connection, reload this page and select your file again.':'La biblioteca de la herramienta no pudo cargarse. Revisa la conexión, recarga esta página y vuelve a seleccionar el archivo.'};
 const loadFailure=['LOCAL_MODEL_LOAD_FAILED','model-load-failed'].includes(error?.code)||/Failed to fetch|fetch failed|network|dynamically imported module|importing a module|Load failed/i.test(String(error?.message||''));
 if(!online&&loadFailure)return {retry:true,text:en?'The operation could not finish while offline. Reconnect and try again; your selected file is still here.':'La operación no pudo terminar sin conexión. Reconecta y vuelve a intentar; el archivo seleccionado sigue aquí.'};
 if(loadFailure)return {retry:true,text:en?'Could not load the tool or its model. Check your connection and try again. No manual model download is needed.':'No se pudo cargar la herramienta o su modelo. Revisa la conexión y reintenta. La carga del modelo es automática.'};
 if(error?.code==='OCR_RECOGNITION_FAILED')return {retry:true,text:en?'Text recognition failed. Try again or choose a clearer JPG, PNG or WebP image.':'El reconocimiento de texto falló. Reintenta o elige una imagen JPG, PNG o WebP más nítida.'};
 return {retry:false,text:error?.message||(en?'The operation could not finish. Check the input and try again.':'No se pudo completar la operación. Revisa la entrada y vuelve a intentar.')};
}
