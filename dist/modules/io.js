import {esc,exportSVG,bounds} from './canvas.js';
import {modelErrors,projectErrors} from './validation.js';
function props(o){return Object.entries(o).map(([key,value])=>`<property key="${esc(key)}" kind="${typeof value==='object'?'json':typeof value}">${esc(typeof value==='object'?JSON.stringify(value):value)}</property>`).join('');}
function readProps(el){const result={};if(!el)return result;for(const p of el.children){if(p.tagName!=='property')throw Error('Unexpected property element.');const k=p.getAttribute('key');if(!k||['__proto__','constructor','prototype'].includes(k)||Object.hasOwn(result,k))throw Error('Invalid or duplicate property key.');const kind=p.getAttribute('kind'),value=p.textContent;if(!['json','number','boolean','string'].includes(kind))throw Error('Unsupported property kind.');if(kind==='boolean'&&!['true','false'].includes(value))throw Error('Invalid boolean property.');if(kind==='number'&&(!value.trim()||!Number.isFinite(Number(value))))throw Error('Invalid numeric property.');result[k]=kind==='json'?JSON.parse(value):kind==='number'?Number(value):kind==='boolean'?value==='true':value;}return result;}
function diagramXML(d){return `  <diagram id="${esc(d.id)}" name="${esc(d.name)}" version="${esc(d.version)}">
    <description>${esc(d.description)}</description><author>${esc(d.author)}</author>
    <metadata>${props(d.metadata)}</metadata><canvas>${props(d.settings)}</canvas>
    <nodes>${d.nodes.map(n=>`<node id="${esc(n.id)}" type="${esc(n.type)}" x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}"><properties>${props(n.properties)}</properties></node>`).join('')}</nodes>
    <streams>${d.edges.map(e=>`<stream id="${esc(e.id)}" source="${esc(e.source)}" destination="${esc(e.destination)}" sourcePort="${esc(e.sourcePort)}" destinationPort="${esc(e.destinationPort)}" routing="${esc(e.routing)}" routeOffset="${e.routeOffset}"><properties>${props(e.properties)}</properties></stream>`).join('')}</streams>
  </diagram>`;}
export function toXML(value){
 if(value.schemaVersion==='2.0'){
  const errors=projectErrors(value);if(errors.length)throw Error(errors.join('\n'));
  return `<?xml version="1.0" encoding="UTF-8"?>
<tengwar version="2.0">
 <project id="${esc(value.id)}" name="${esc(value.name)}" version="${esc(value.version)}" activeDiagramId="${esc(value.activeDiagramId)}">
  <description>${esc(value.description)}</description><author>${esc(value.author)}</author><metadata>${props(value.metadata)}</metadata>
  <diagrams>${value.diagrams.map(diagramXML).join('\n')}</diagrams>
 </project>
</tengwar>`;
 }
 return `<?xml version="1.0" encoding="UTF-8"?>\n<tengwar version="1.0">\n${diagramXML(value)}\n</tengwar>`;
}
function direct(el,tag,required=true){const hits=[...el.children].filter(x=>x.tagName===tag);if(hits.length>1||required&&!hits.length)throw Error(`Expected one <${tag}> element.`);return hits[0];}
function readDiagram(di){
 const nodes=direct(di,'nodes'),streams=direct(di,'streams');
 return {schemaVersion:'1.0',id:di.getAttribute('id'),name:di.getAttribute('name'),version:di.getAttribute('version'),description:direct(di,'description').textContent,author:direct(di,'author').textContent,metadata:readProps(direct(di,'metadata')),settings:readProps(direct(di,'canvas')),nodes:[...nodes.children].map(n=>{
  if(n.tagName!=='node')throw Error('Unexpected component element.');for(const k of ['x','y','width','height'])if(!n.hasAttribute(k)||!n.getAttribute(k).trim())throw Error('Missing component geometry.');
  return {id:n.getAttribute('id'),type:n.getAttribute('type'),x:Number(n.getAttribute('x')),y:Number(n.getAttribute('y')),width:Number(n.getAttribute('width')),height:Number(n.getAttribute('height')),properties:readProps(direct(n,'properties'))};
 }),edges:[...streams.children].map(e=>{
  if(e.tagName!=='stream')throw Error('Unexpected stream element.');if(!e.hasAttribute('routeOffset'))throw Error('Missing routing offset.');return Object.fromEntries(['id','source','destination','sourcePort','destinationPort','routing','routeOffset'].map(k=>[k,k==='routeOffset'?Number(e.getAttribute(k)):e.getAttribute(k)]).concat([['properties',readProps(direct(e,'properties'))]]));
 })};
}
export function fromXML(text){
 if(text.length>10*1024*1024)throw Error('The XML exceeds the 10 MB project import limit.');if(/<!DOCTYPE|<!ENTITY/i.test(text))throw Error('Document type and external entity declarations are not supported.');
 const xml=new DOMParser().parseFromString(text,'application/xml');if(xml.querySelector('parsererror'))throw Error('The file contains malformed XML.');
 const root=xml.documentElement,version=root.getAttribute('version');if(root.tagName!=='tengwar'||!['1.0','2.0'].includes(version))throw Error('This is not a supported Tengwar file.');
 let value,errors;
 if(version==='1.0'){value=readDiagram(direct(root,'diagram'));errors=modelErrors(value);}
 else {
  const p=direct(root,'project'),list=direct(p,'diagrams');
  if(!list.children.length||list.children.length>100)throw Error('A project must contain between 1 and 100 flows.');
  value={schemaVersion:'2.0',id:p.getAttribute('id'),name:p.getAttribute('name'),version:p.getAttribute('version'),activeDiagramId:p.getAttribute('activeDiagramId'),description:direct(p,'description').textContent,author:direct(p,'author').textContent,metadata:readProps(direct(p,'metadata')),diagrams:[...list.children].map(di=>{if(di.tagName!=='diagram')throw Error('Unexpected flow element.');return readDiagram(di);})};errors=projectErrors(value);
 }
 if(errors.length)throw Error(`${errors.length} validation errors found.\n\n${errors.join('\n')}`);return value;
}
export function download(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
export function filename(d){return (d.name||'Tengwar diagram').replace(/[^a-zA-Z0-9 _-]/g,'').trim()||'Tengwar diagram';}
export async function exportFile(d,format,scale=2){if(format==='xml'){download(new Blob([toXML(d)],{type:'application/xml'}),filename(d)+'.xml');return;}
 if(d.schemaVersion==='2.0')d=d.diagrams.find(flow=>flow.id===d.activeDiagramId)||d.diagrams[0];
 const transparent=format==='png-transparent';const svg=exportSVG(d,transparent);if(format==='svg'){download(new Blob([svg],{type:'image/svg+xml'}),filename(d)+'.svg');return;}
 const b=bounds(d),w=Math.ceil(b.width*scale),h=Math.ceil(b.height*scale);if(w*h>64000000||w>16000||h>16000)throw Error('This diagram is too large for PNG at the selected resolution. Use SVG or a lower scale.');
 const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));try{const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Unable to render this export.'));img.src=url;});const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');ctx.drawImage(img,0,0,w,h);const blob=await new Promise(r=>c.toBlob(r,'image/png'));if(!blob)throw Error('PNG could not be created. Try SVG.');download(blob,filename(d)+(transparent?' - transparent':'')+'.png');}finally{URL.revokeObjectURL(url);}
}
export const localFileAdapter={open:async file=>fromXML(await file.text()),save:diagram=>exportFile(diagram,'xml')};
