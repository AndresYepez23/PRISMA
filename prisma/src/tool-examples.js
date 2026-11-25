// Synthetic examples only. Loading an example never runs an engine or a provider.
const examples={
 'csv-to-tsv-local':{text:'name;note\nAna;Example\nLuis;Second row',mode:'csv-to-tsv',delimiter:';'},
 'citation-generator':{author:'Smith, J.',year:'2024',title:'Study handbook',source:'Example Press',style:'apa'},
 'word-count':{text:'Prisma makes everyday tasks easier.\nReview the result before sharing.'},
 base64:{text:'Prisma Space',mode:'encode'},'url-code':{text:'Prisma Space / 100%',mode:'encode'},
 'text-remove-accents':{text:'Información, café, acción.'},'text-reverse':{text:'First\nSecond\nThird',mode:'lines'},
 'text-extract-emails':{text:'Contact: ana@example.com; support@example.org; ana@example.com'},
 'text-extract-urls':{text:'Sources: https://example.com/article and https://example.org/reference'},
 'text-remove-empty-lines':{text:'First\n\nSecond\n   \nThird'},'text-prefix-lines':{text:'alpha\nbeta\ngamma',prefix:'item-',suffix:'.txt'},
 'text-replace':{text:'draft-report and draft-notes',search:'draft',replacement:'final',replaceAll:true},
 'text-extract-hashtags':{text:'#Prisma #diseño #Prisma #tools'},'text-extract-phones':{text:'Office: +57 300 123 4567; contact: +34 612 345 678.'},
 'text-case':{text:'A Practical Example',mode:'lower'},'dedupe-lines':{text:'alpha\nbeta\nalpha\ngamma'},
 'clean-text':{text:'First   sentence.\n\n\nSecond   sentence.'},'text-sort':{text:'gamma\nalpha\nbeta'},
 'word-frequency':{text:'PDF tools help with PDF files. Image tools help with image files.'},
 'text-diff':{textA:'First line\nOriginal version\nLast line',textB:'First line\nRevised version\nLast line'},
 'reading-time-local':{text:Array(220).fill('word').join(' '),wpm:'220'},
 qr:{text:'https://prismaspace.space/'},'jwt-decode':{token:'eyJhbGciOiJub25lIn0.eyJzdWIiOiJleGFtcGxlIiwicm9sZSI6InJlYWRlciJ9.'},
 'html-format':{text:'<main><h1>Report</h1><p>Summary</p></main>'},'css-format':{text:'.card{padding:16px;color:#123456;background:white}'},
 'js-format':{text:'const total=[2,3].reduce((a,b)=>a+b,0);'},'sql-format':{text:'select id,name from products where active = true order by name;'},
 'text-redact-sensitive':{text:'Contact ana@example.com or +57 300 123 4567.'},
 'subtitle-srt-local':{text:'Welcome to the project.\nHere is the first step.\nReview the result.',secondsPerCue:'4'},
 'citation-ids-local':{text:'Example references: DOI 10.1000/182; PMID: 12345678; arXiv: 2301.00001.'}
};
export function toolExample(id){return examples[id];}
