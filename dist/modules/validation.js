import {definitions,streamTypes,linkTypes} from './components.js';
export function modelErrors(d){const out=[];
 if(!d||d.schemaVersion!=='1.0')return ['Unsupported Tengwar schema version. Expected 1.0.'];
 if(typeof d.id!=='string'||typeof d.name!=='string'||typeof d.version!=='string'||typeof d.description!=='string'||typeof d.author!=='string')out.push('Diagram identity and text metadata are required.');
 if(!d.metadata||typeof d.metadata!=='object'||Array.isArray(d.metadata))out.push('Diagram metadata must be an object.');
 if(!d.settings||!['light','dark'].includes(d.settings.theme)||!['horizontal','vertical'].includes(d.settings.orientation)||!Number.isFinite(d.settings.gridSize)||d.settings.gridSize<8||d.settings.gridSize>80||['grid','snap','showStreamLabels'].some(k=>typeof d.settings[k]!=='boolean'))out.push('Canvas settings are invalid.');
 if(!Array.isArray(d.nodes)||!Array.isArray(d.edges))return [...out,'Nodes and streams must be arrays.'];
 if(d.nodes.length>1000||d.edges.length>3000)return [...out,'The file exceeds the supported limit (1,000 components / 3,000 streams).'];
 const ids=new Set();for(const n of d.nodes){if(typeof n.id!=='string'||!n.id||ids.has(n.id))out.push('A component has a missing or duplicate ID.');ids.add(n.id);if(!definitions[n.type])out.push(`Unknown component type: ${n.type}`);if(['x','y','width','height'].some(k=>!Number.isFinite(n[k])||Math.abs(n[k])>100000)||n.width<64||n.height<48)out.push(`Invalid dimensions or position: ${n.id}`);if(!n.properties||typeof n.properties!=='object'||Array.isArray(n.properties)||Object.entries(n.properties).some(([k,v])=>k==='additional'?v===null||typeof v!=='object'||Array.isArray(v):typeof v!=='string'))out.push(`Invalid component properties: ${n.id}`);}
 const edgeIds=new Set();for(const e of d.edges){if(typeof e.id!=='string'||!e.id||edgeIds.has(e.id)||ids.has(e.id))out.push('A stream has a missing or duplicate ID.');edgeIds.add(e.id);const a=d.nodes.find(n=>n.id===e.source),b=d.nodes.find(n=>n.id===e.destination);if(!a||!b)out.push(`Stream ${e.id} references a missing source or destination.`);if(a&&!definitions[a.type]?.ports.includes(e.sourcePort)||b&&!definitions[b.type]?.ports.includes(e.destinationPort))out.push(`Stream ${e.id} references an incompatible port.`);if(!['auto','manual'].includes(e.routing)||!Number.isFinite(e.routeOffset)||Math.abs(e.routeOffset)>100000)out.push(`Invalid routing: ${e.id}`);if(!e.properties||typeof e.properties!=='object'||!streamTypes.includes(e.properties.type)||!linkTypes.includes(e.properties.linkType)||Object.entries(e.properties).some(([k,v])=>k==='additional'?v===null||typeof v!=='object'||Array.isArray(v):typeof v!=='string'))out.push(`Invalid stream properties: ${e.id}`);}
 return out;
}
export function validate(d){
 const findings=[];let passes=0;const test=(name,fn)=>{const before=findings.length;fn((level,message,id)=>findings.push({level,message,id,check:name}));if(findings.length===before)passes++;};
 const incoming=n=>d.edges.filter(e=>e.destination===n.id),outgoing=n=>d.edges.filter(e=>e.source===n.id);
 test('Connectivity',add=>{for(const n of d.nodes)if(definitions[n.type].family!=='documentation'&&!incoming(n).length&&!outgoing(n).length)add('warning',`${n.properties.name||'Unnamed component'} is not connected.`,n.id);});
 test('Stream endpoints',add=>{for(const e of d.edges)if(!d.nodes.some(n=>n.id===e.source)||!d.nodes.some(n=>n.id===e.destination))add('error',`${e.properties.streamId} has a missing endpoint.`,e.id);});
 test('Port references',add=>{for(const e of d.edges){const a=d.nodes.find(n=>n.id===e.source),b=d.nodes.find(n=>n.id===e.destination);if(a&&!definitions[a.type].ports.includes(e.sourcePort)||b&&!definitions[b.type].ports.includes(e.destinationPort))add('error',`${e.properties.streamId} references an invalid port.`,e.id);}});
 test('Split outputs',add=>{d.nodes.filter(n=>n.type==='split').forEach(n=>{if(outgoing(n).length<2)add('warning',`${n.properties.name} needs at least two outgoing streams.`,n.id);});});
 test('Merge inputs',add=>{d.nodes.filter(n=>n.type==='merge').forEach(n=>{if(incoming(n).length<2)add('warning',`${n.properties.name} needs at least two incoming streams.`,n.id);});});
 test('Recycle loops',add=>{
 const adj=new Map(d.nodes.map(n=>[n.id,[]]));d.edges.filter(e=>e.properties.type!=='Recycle'&&e.properties.linkType!=='Recycle'&&!/Sampling|Information/.test(e.properties.linkType)).forEach(e=>adj.get(e.source)?.push(e));const state=new Map();
 const walk=id=>{state.set(id,1);for(const e of adj.get(id)||[]){if(state.get(e.destination)===1)add('warning',`Loop through ${e.properties.streamId} is not identified as recycle.`,e.id);else if(!state.get(e.destination))walk(e.destination);}state.set(id,2);};d.nodes.forEach(n=>{if(!state.get(n.id))walk(n.id);});
 });
 test('Operation inputs',add=>{d.nodes.filter(n=>definitions[n.type].family==='operation'&&!incoming(n).some(e=>!/Sampling|Information/.test(e.properties.linkType))).forEach(n=>add('warning',`${n.properties.name} has no material inlet.`,n.id));});
 test('Operation dead ends',add=>{d.nodes.filter(n=>definitions[n.type].family==='operation'&&!outgoing(n).some(e=>!/Sampling|Information/.test(e.properties.linkType))).forEach(n=>add('warning',`${n.properties.name} has no material outlet.`,n.id));});
 test('Equipment identification',add=>{const seen=new Set();d.nodes.forEach(n=>{const id=n.properties.equipmentId?.trim();if(id&&seen.has(id))add('error',`Duplicate Equipment ID: ${id}.`,n.id);if(id)seen.add(id);});});
 test('Stream identification',add=>{const seen=new Set();d.edges.forEach(e=>{const id=e.properties.streamId?.trim();if(!id)add('warning','A stream has no Stream ID.',e.id);else if(seen.has(id))add('error',`Duplicate Stream ID: ${id}.`,e.id);seen.add(id);});});
 test('Component names',add=>{d.nodes.filter(n=>!n.properties.name?.trim()).forEach(n=>add('error','A component has no name.',n.id));});
 test('Stream names',add=>{d.edges.filter(e=>!e.properties.name?.trim()).forEach(e=>add('warning',`${e.properties.streamId} has no stream name.`,e.id));});
 test('Output classification',add=>{d.nodes.filter(n=>['product','by-product','waste','recovered-material','recycle-material'].includes(n.type)&&!n.properties.classification?.trim()).forEach(n=>add('warning',`${n.properties.name} has no output classification.`,n.id));});
 test('Waste stream classification',add=>{d.edges.filter(e=>d.nodes.find(n=>n.id===e.destination)?.type==='waste'&&e.properties.type!=='Waste').forEach(e=>add('warning',`${e.properties.streamId} reaches waste but is not classified as Waste.`,e.id));});
 test('Recycle destinations',add=>{d.nodes.filter(n=>['recycle','recycle-material'].includes(n.type)&&!outgoing(n).length).forEach(n=>add('error',`${n.properties.name} has no recycle destination.`,n.id));});
 test('Final product',add=>{if(d.nodes.length&&!d.nodes.some(n=>n.type==='product'))add('information','No final product has been identified.',null);});
 test('Sample association',add=>{d.nodes.filter(n=>['sample-point','ipc','in-line-analysis','analytical-test'].includes(n.type)&&![...incoming(n),...outgoing(n)].some(e=>{const other=d.nodes.find(x=>x.id===(e.source===n.id?e.destination:e.source));return other&&['operation','material','equipment'].includes(definitions[other.type].family);})).forEach(n=>add('warning',`${n.properties.name} has no associated process step or material.`,n.id));});
 test('QC references',add=>{d.nodes.filter(n=>n.type==='qc'&&!n.properties.reference?.trim()).forEach(n=>add('warning',`${n.properties.name} has no quality reference.`,n.id));});
 test('Mandatory documentation',add=>{d.nodes.forEach(n=>{(n.properties.requiredFields||'').split(',').map(k=>k.trim()).filter(Boolean).forEach(k=>{if(!String(n.properties[k]||n.properties.additional?.[k]||'').trim())add('error',`${n.properties.name}: required property “${k}” is missing.`,n.id);});});});
 test('Unused material outlets',add=>{d.nodes.filter(n=>['raw-material','reagent','solvent','intermediate','process-stream'].includes(n.type)&&!outgoing(n).length).forEach(n=>add('warning',`${n.properties.name} has no outgoing material stream.`,n.id));});
 return {passes,checks:20,findings,errors:findings.filter(f=>f.level==='error').length,warnings:findings.filter(f=>f.level==='warning').length,information:findings.filter(f=>f.level==='information').length};
}

export function projectErrors(p){
 if(!p||p.schemaVersion!=='2.0')return ['Unsupported project schema. Expected Tengwar 2.0.'];
 const errors=[];
 if(['id','name','description','author','version','activeDiagramId'].some(k=>typeof p[k]!=='string')||!p.id)errors.push('Project identity and text metadata are required.');
 if(!p.metadata||typeof p.metadata!=='object'||Array.isArray(p.metadata))errors.push('Project metadata must be an object.');
 if(!Array.isArray(p.diagrams)||!p.diagrams.length||p.diagrams.length>100)return [...errors,'A project must contain between 1 and 100 flows.'];
 const ids=new Set();let nodeCount=0,edgeCount=0;
 for(const d of p.diagrams){if(!d||typeof d!=='object'){errors.push('Invalid flow document.');continue;}if(ids.has(d.id))errors.push('Duplicate flow ID: '+d.id);ids.add(d.id);try{errors.push(...modelErrors(d).map(e=>(d.name||'Flow')+': '+e));}catch{errors.push('Malformed flow document.');}nodeCount+=d.nodes?.length||0;edgeCount+=d.edges?.length||0;}
 if(!ids.has(p.activeDiagramId))errors.push('The active flow does not exist in this project.');
 if(nodeCount>10000||edgeCount>30000)errors.push('Project exceeds the supported component or stream limit.');
 return errors;
}
