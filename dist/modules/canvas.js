import {definitions,icon} from './components.js';
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export const palettes={light:{canvas:'#f5f6f9',surface:'#ffffff',text:'#252d3c',muted:'#788295',line:'#9ca8bb',border:'#d7deea',accent:'#4c5adc',accentFill:'#f0f2ff',quality:'#66897f',doc:'#fff9e7'},dark:{canvas:'#151922',surface:'#212735',text:'#e1e7f2',muted:'#909db1',line:'#718199',border:'#3b465a',accent:'#98a1ff',accentFill:'#282d47',quality:'#98b9ae',doc:'#302d23'}};
const dirs={left:{x:-1,y:0},right:{x:1,y:0},top:{x:0,y:-1},bottom:{x:0,y:1}};
export function port(n,side){return side==='left'?{x:n.x,y:n.y+n.height/2}:side==='right'?{x:n.x+n.width,y:n.y+n.height/2}:side==='top'?{x:n.x+n.width/2,y:n.y}:{x:n.x+n.width/2,y:n.y+n.height};}
export function edgePoints(e,nodes){
 const a=nodes.find(n=>n.id===e.source),b=nodes.find(n=>n.id===e.destination);if(!a||!b)return [];
 const p=port(a,e.sourcePort),q=port(b,e.destinationPort),ds=dirs[e.sourcePort],dt=dirs[e.destinationPort],gap=26;
 const s={x:p.x+ds.x*gap,y:p.y+ds.y*gap},t={x:q.x+dt.x*gap,y:q.y+dt.y*gap};
 let inner;
 if(e.routing==='manual'){
  if(ds.x){const x=e.routeOffset;inner=[{x,y:s.y},{x,y:t.y}];if(!dt.x)inner.push({x:t.x,y:t.y});}
  else {const y=e.routeOffset;inner=[{x:s.x,y},{x:t.x,y}];if(dt.x)inner.push({x:t.x,y:t.y});}
 } else if(ds.x&&dt.x){
  if(ds.x===-dt.x&&((ds.x>0&&s.x<=t.x)||(ds.x<0&&s.x>=t.x))){const x=(s.x+t.x)/2;inner=[{x,y:s.y},{x,y:t.y}];}
  else {const y=Math.min(a.y,b.y)-42;inner=[{x:s.x,y},{x:t.x,y}];}
 } else if(!ds.x&&!dt.x){
  if(ds.y===-dt.y&&((ds.y>0&&s.y<=t.y)||(ds.y<0&&s.y>=t.y))){const y=(s.y+t.y)/2;inner=[{x:s.x,y},{x:t.x,y}];}
  else {const x=Math.max(a.x+a.width,b.x+b.width)+42;inner=[{x,y:s.y},{x,y:t.y}];}
 }else if(ds.x)inner=[{x:t.x,y:s.y}];else inner=[{x:s.x,y:t.y}];
 return [p,s,...inner,t,q].filter((v,i,arr)=>i===0||v.x!==arr[i-1].x||v.y!==arr[i-1].y);
}
export function roundedPath(points,r=8){if(!points.length)return '';let d=`M ${points[0].x} ${points[0].y}`;for(let i=1;i<points.length-1;i++){const a=points[i-1],b=points[i],c=points[i+1];const l1=Math.hypot(b.x-a.x,b.y-a.y),l2=Math.hypot(c.x-b.x,c.y-b.y);const k=Math.min(r,l1/2,l2/2);if(!l1||!l2)continue;const u={x:b.x-(b.x-a.x)*k/l1,y:b.y-(b.y-a.y)*k/l1},v={x:b.x+(c.x-b.x)*k/l2,y:b.y+(c.y-b.y)*k/l2};d+=` L ${u.x} ${u.y} Q ${b.x} ${b.y} ${v.x} ${v.y}`;}return d+` L ${points.at(-1).x} ${points.at(-1).y}`;}
export function labelPoint(points){if(points.length<2)return{x:0,y:0};let lengths=points.slice(1).map((v,i)=>Math.hypot(v.x-points[i].x,v.y-points[i].y));let half=lengths.reduce((a,b)=>a+b,0)/2;for(let i=0;i<lengths.length;i++){if(half<=lengths[i]){const t=half/lengths[i];return{x:points[i].x+(points[i+1].x-points[i].x)*t,y:points[i].y+(points[i+1].y-points[i].y)*t};}half-=lengths[i];}return points[0];}
function shorten(s,max){const v=String(s||'');return v.length>max?v.slice(0,max-1)+'…':v;}
function lines(s,max){
 max=Math.max(3,Math.floor(max));const words=String(s||'Unnamed').split(/\s+/);const result=[''];
 for(const word of words){let w=word;while(w.length>max){if(result.at(-1))result.push('');result[result.length-1]=w.slice(0,max);w=w.slice(max);result.push('');}if((result.at(-1)+' '+w).trim().length>max&&result.at(-1))result.push(w);else result[result.length-1]+=(result.at(-1)?' ':'')+w;}
 const populated=result.filter(Boolean);if(populated.length>2)return [populated[0],shorten(populated.slice(1).join(' '),max)];return populated.length?populated:['Unnamed'];
}
const txt=(x,y,t,extra='')=>`<text x="${x}" y="${y}" ${extra}>${esc(t)}</text>`;
export function nodeSVG(n,theme,selected=false,interactive=true){
 const p=palettes[theme],d=definitions[n.type],w=n.width,h=n.height,v=n.properties;const accent=v.accent==='cobalt'?p.accent:v.accent==='teal'?p.quality:v.accent==='graphite'?p.muted:p.accent;
 let shape,content;const stroke=selected?accent:p.border;const fill=selected?p.accentFill:p.surface;
 const scale=Math.max(.7,Math.min(1.8,Math.min(w/d.width,h/d.height))),font=19*scale,meta=14*scale;
 if(d.container){shape=`<rect width="${w}" height="${h}" rx="8" fill="${p.accent}" fill-opacity="0.025" stroke="${stroke}" stroke-dasharray="6 5"/>`;content=txt(16,29,shorten(v.name,Math.floor((w-32)/10)),`font-size="16" font-weight="600" fill="${p.muted}" letter-spacing=".6"`);}
 else if(d.family==='material'){
  shape=`<polygon points="22,0 ${w-22},0 ${w},${h/2} ${w-22},${h} 22,${h} 0,${h/2}" fill="${fill}" stroke="${stroke}" stroke-width="${selected?2:1.5}"/>`;
  const titleFont=18*scale,a=lines(v.name,(w-18)/(titleFont*.61)),first=a.length===1?h*.55:h*.44,lineHeight=titleFont*1.16;
  content=`<g transform="translate(${w/2-10*scale},${10*scale})" color="${n.type==='waste'?p.muted:accent}">${icon(n.type,20*scale)}</g>`+a.map((l,i)=>txt(w/2,first+i*lineHeight,l,`text-anchor="middle" font-size="${titleFont}" font-weight="600"`)).join('')+txt(w/2,h-14*scale,shorten([v.quantity,v.unit].filter(Boolean).join(' ')||v.material||d.label,Math.floor((w-46)/(meta*.61))),`text-anchor="middle" fill="${p.muted}" font-size="${meta}"`);
 }else if(d.family==='logic'){
  shape=`<path d="M ${w/2} 0 ${w} ${h/2} ${w/2} ${h} 0 ${h/2}Z" fill="${fill}" stroke="${stroke}"/>`;content=`<g transform="translate(${w/2-9*scale},${14*scale})" color="${accent}">${icon(n.type,18*scale)}</g>`+lines(v.name,(w*.73)/(14*scale*.61)).map((l,i)=>txt(w/2,h*.59+i*16*scale,l,`text-anchor="middle" font-size="${14*scale}" font-weight="600"`)).join('');
 }else {
  const isQ=d.family==='quality',isDoc=d.family==='documentation';shape=`<rect width="${w}" height="${h}" rx="5" fill="${isDoc?p.doc:fill}" stroke="${stroke}" stroke-width="${selected?2:1.3}" ${isQ?'stroke-dasharray="4 3"':''}/><path d="M1 13v${h-26}" stroke="${isQ?p.quality:accent}" stroke-width="3"/>`;
  const a=lines(v.name,(w-30)/(font*.61)),first=a.length===1?h*.43:h*.32;
  content=a.map((l,i)=>txt(15,first+i*font*1.12,l,`font-size="${font}" font-weight="600"`)).join('')+`<g transform="translate(15,${h-29*scale})" color="${isQ?p.quality:accent}">${icon(n.type,17*scale)}</g>`+txt(39*scale,h-14*scale,shorten([v.equipmentId,v.test||v.material||(isDoc?v.description:v.equipmentId?v.equipmentType:d.label)].filter(Boolean).join(' · '),Math.floor((w-53*scale)/(meta*.61))),`font-size="${meta}" fill="${p.muted}"`);
 }
 const ports=interactive&&!d.container?d.ports.map(side=>{const a=port({...n,x:0,y:0},side);return `<circle data-port="${side}" data-node="${esc(n.id)}" cx="${a.x}" cy="${a.y}" r="5" fill="${p.surface}" stroke="${accent}" stroke-width="1.7" class="port"/>`;}).join(''):'';
 const resize=interactive&&selected?`<rect data-resize="${esc(n.id)}" x="${w-5}" y="${h-5}" width="10" height="10" fill="${p.surface}" stroke="${accent}" class="resize-handle"/>`:'';
 return `<g data-node="${esc(n.id)}" class="node ${selected?'selected':''} ${d.container?'container-node':''}" transform="translate(${n.x},${n.y})" fill="${p.text}" font-family="ui-monospace, SFMono-Regular, Consolas, monospace">${shape}${content}${ports}${resize}</g>`;
}
export function edgesSVG(d,selected,interactive=true){const p=palettes[d.settings.theme];return d.edges.map(e=>{
 const pts=edgePoints(e,d.nodes);if(!pts.length)return '';const path=roundedPath(pts),q=labelPoint(pts);const sel=selected.has(e.id);const kind=e.properties.linkType;const dashed=/Recycle|Sampling|Information/.test(kind);const color=sel?p.accent:/Sampling/.test(kind)?p.quality:p.line;
 return `<g data-edge="${esc(e.id)}" class="edge ${sel?'selected':''}">${interactive?`<path d="${path}" fill="none" stroke="transparent" stroke-width="18" class="edge-hit"/>`:''}<path d="${path}" fill="none" stroke="${color}" stroke-width="${sel?2.5:1.7}" ${dashed?'stroke-dasharray="6 5"':''} marker-end="url(#${sel?'arrow-selected':'arrow'})"/>${d.settings.showStreamLabels?`<rect x="${q.x-27}" y="${q.y-23}" width="54" height="20" rx="3" fill="${p.canvas}"/><text x="${q.x}" y="${q.y-7}" text-anchor="middle" fill="${sel?p.accent:p.muted}" font-family="ui-monospace,Consolas,monospace" font-size="13">${esc(e.properties.streamId)}</text>`:''}${interactive&&sel?`<circle data-route="${esc(e.id)}" cx="${q.x}" cy="${q.y}" r="6" fill="${p.surface}" stroke="${p.accent}" class="route-handle"/>`:''}</g>`;
 }).join('');}
export function defs(theme){const p=palettes[theme];return `<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1 L 9 5 L 0 9" fill="none" stroke="${p.line}" stroke-width="1.5"/></marker><marker id="arrow-selected" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1 L 9 5 L 0 9" fill="none" stroke="${p.accent}" stroke-width="1.5"/></marker></defs>`;}
export function bounds(d){const points=d.nodes.flatMap(n=>[{x:n.x,y:n.y},{x:n.x+n.width,y:n.y+n.height}]).concat(d.edges.flatMap(e=>edgePoints(e,d.nodes)));if(!points.length)return{x:0,y:0,width:800,height:600};const minX=Math.min(...points.map(n=>n.x)),minY=Math.min(...points.map(n=>n.y));return{x:minX-45,y:minY-45,width:Math.max(...points.map(n=>n.x))-minX+90,height:Math.max(...points.map(n=>n.y))-minY+90};}
export function renderDiagram(d,selected=new Set(),interactive=true){return defs(d.settings.theme)+d.nodes.filter(n=>definitions[n.type].container).map(n=>nodeSVG(n,d.settings.theme,selected.has(n.id),interactive)).join('')+edgesSVG(d,selected,interactive)+d.nodes.filter(n=>!definitions[n.type].container).map(n=>nodeSVG(n,d.settings.theme,selected.has(n.id),interactive)).join('');}
export function exportSVG(d,transparent=false){const b=bounds(d);return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(b.width)}" height="${Math.ceil(b.height)}" viewBox="${b.x} ${b.y} ${b.width} ${b.height}" role="img" aria-label="${esc(d.name)}"><title>${esc(d.name)}</title>${transparent?'':`<rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" fill="${palettes[d.settings.theme].canvas}"/>`}${renderDiagram(d,new Set(),false)}</svg>`;}
