import {definitions} from './components.js';
export const clone=x=>structuredClone(x);
export const uid=prefix=>prefix+'-'+crypto.randomUUID().slice(0,8);
export function createNode(type,x,y){const d=definitions[type];if(!d)throw Error('Unknown component');return {id:uid('n'),type,x,y,width:d.width,height:d.height,properties:clone(d.defaults)};}
export function createStream(source,destination,sourcePort='right',destinationPort='left',index=1){return {id:uid('e'),source,destination,sourcePort,destinationPort,routing:'auto',routeOffset:0,properties:{streamId:'S-'+String(index).padStart(3,'0'),name:'Material transfer',type:'Process',linkType:'Material Flow',material:'',phase:'',description:'',notes:'',additional:{}}};}
export function blankDiagram(){return {schemaVersion:'1.0',id:uid('diagram'),name:'Untitled process',description:'',author:'',version:'1.0',metadata:{},settings:{orientation:'horizontal',grid:true,snap:true,gridSize:20,theme:'light',showStreamLabels:true},nodes:[],edges:[]};}
export function demoDiagram(){
 const d=blankDiagram();d.name='API Purification Process';d.description='Illustrative process documentation · API purification, isolation and solvent recovery. Parameters are annotations, not a validated process recipe.';d.version='1.0';
 const n=(id,type,x,y,name,props={})=>{let a=createNode(type,x,y);a.id=id;a.properties={...a.properties,name,...props};d.nodes.push(a);return a;};
 n('raw','raw-material',40,225,'API crude',{material:'Raw Material A',quantity:'100',unit:'kg'});
 n('solvent','solvent',250,30,'Ethanol',{quantity:'500',unit:'L'});
 n('catalyst','reagent',500,30,'Pd/C catalyst',{quantity:'5',unit:'kg'});
 n('mix','mixing',240,245,'Charge & Mix',{equipmentId:'V-101',equipmentType:'Mixing Vessel',description:'Charge the crude API and solvent; prepare the reaction mixture.',capacity:'800 L',material:'API crude / ethanol'});
 n('reaction','reaction',490,245,'Reaction',{equipmentId:'R-101',equipmentType:'Reactor',description:'Document the transformation stage and associated process controls.',capacity:'1,000 L',test:'IPC: HPLC',reference:'DEV-PR-001'});
 n('filter','filtration',740,245,'Filtration',{equipmentId:'F-101',equipmentType:'Nutsche Filter',description:'Separate the product cake from the mother liquor.',classification:'Intermediate',reference:'DEV-PR-001'});
 n('cake','intermediate',995,224,'Product cake',{material:'Wet API',classification:'Intermediate'});
 n('dry','drying',970,440,'Vacuum drying',{equipmentId:'D-101',equipmentType:'Vacuum Dryer',description:'Document drying and residual-solvent testing.',reference:'DEV-PR-001'});
 n('product','product',995,630,'Final product',{material:'Purified API',classification:'Product',reference:'QC-API-001'});
 n('mother','intermediate',765,435,'Mother liquor',{material:'Solvent-rich filtrate',classification:'Intermediate'});
 n('recover','distillation',490,455,'Solvent recovery',{equipmentId:'C-101',equipmentType:'Column',description:'Recover solvent and document the residual waste stream.'});
 n('recycled','recycle-material',265,434,'Recovered solvent',{material:'Ethanol',classification:'Recycle'});
 n('waste','waste',515,655,'Waste stream',{material:'Distillation residue',classification:'Waste'});
 n('ipc','ipc',245,660,'IPC sample',{test:'HPLC',reference:'IPC-001',description:'Sample associated with the reaction stage.'});
 n('qc','qc',740,650,'QC sample',{test:'Residual solvents',reference:'QC-API-001',description:'Quality sample associated with final product.'});
 const e=(s,t,name,type='Process',sp='right',tp='left',options={})=>{let a=createStream(s,t,sp,tp,d.edges.length+1);a.id='e-'+(d.edges.length+1);a.properties={...a.properties,name,type,linkType:type==='Recycle'?'Recycle':type==='Sample'?'Sampling / Analytical Link':type==='Process'?'Main Process Flow':'Material Flow',material:options.material||''};Object.assign(a,options);d.edges.push(a);return a;};
 e('raw','mix','API crude');e('solvent','mix','Ethanol charge','Solvent','bottom','top');e('catalyst','reaction','Catalyst charge','Process','bottom','top');e('mix','reaction','Reaction mixture');e('reaction','filter','Reaction slurry');e('filter','cake','Wet cake','Intermediate');e('cake','dry','Product cake','Intermediate','bottom','top');e('dry','product','Dried API','Product','bottom','top');e('filter','mother','Mother liquor','Side stream','bottom','top');e('mother','recover','Filtrate','Solvent','left','right');e('recover','recycled','Recovered ethanol','Recycle','left','right');e('recycled','mix','Solvent recycle','Recycle','left','bottom',{routing:'manual',routeOffset:170});e('recover','waste','Residue','Waste','bottom','top');e('reaction','ipc','IPC sample','Sample','bottom','right',{routing:'manual',routeOffset:395});e('product','qc','QC sample','Sample','left','right');
 return d;
}
export function blankProject(name='Untitled project'){
 const flow=blankDiagram();flow.name='Flow 1';
 return {schemaVersion:'2.0',id:uid('project'),name,description:'',author:'',version:'1.0',metadata:{},activeDiagramId:flow.id,diagrams:[flow]};
}
export function asProject(value){
 if(value?.schemaVersion==='2.0'&&Array.isArray(value.diagrams))return value;
 const p=blankProject(value?.name||'Untitled project');p.diagrams=[value];p.activeDiagramId=value.id;return p;
}
export function nextFlowName(project,base='Flow'){
 if(!project.diagrams.some(d=>d.name===base)&&base!=='Flow')return base;
 let i=base==='Flow'?1:2;while(project.diagrams.some(d=>d.name===base+' '+i))i++;return base+' '+i;
}
export class Store extends EventTarget{
 constructor(value){super();this.project=asProject(value);this.past=[];this.future=[];this.autosaveOk=true;}
 get diagram(){return this.project.diagrams.find(d=>d.id===this.project.activeDiagramId)||this.project.diagrams[0];}
 emit(){this.dispatchEvent(new Event('change'));}
 commit(fn){const before=clone(this.project);try{fn(this.diagram,this.project);}catch(error){this.project=before;throw error;}this.past.push(before);if(this.past.length>60)this.past.shift();this.future=[];this.persist();this.emit();}
 persist(){try{localStorage.setItem('tengwar.project.v2',JSON.stringify(this.project));this.autosaveOk=true;}catch{this.autosaveOk=false;}}
 undo(){if(!this.past.length)return false;this.future.push(clone(this.project));this.project=this.past.pop();this.persist();this.emit();return true;}
 redo(){if(!this.future.length)return false;this.past.push(clone(this.project));this.project=this.future.pop();this.persist();this.emit();return true;}
 replace(value){this.commit(()=>{this.project=asProject(value);});}
 switchFlow(id){if(!this.project.diagrams.some(d=>d.id===id))throw Error('Flow not found');this.project.activeDiagramId=id;this.persist();this.emit();}
 addFlow(flow){if(this.project.diagrams.reduce((n,d)=>n+d.nodes.length,0)+flow.nodes.length>10000||this.project.diagrams.reduce((n,d)=>n+d.edges.length,0)+flow.edges.length>30000)throw Error('Project component or stream limit exceeded.');if(this.project.diagrams.length>=100)throw Error('A project supports up to 100 flows.');if(this.project.diagrams.some(d=>d.id===flow.id))throw Error('Duplicate flow ID');this.commit((d,p)=>{p.diagrams.push(flow);p.activeDiagramId=flow.id;});return flow.id;}
 duplicateFlow(id){const source=this.project.diagrams.find(d=>d.id===id);if(!source)throw Error('Flow not found');const flow=clone(source);flow.id=uid('diagram');flow.name=nextFlowName(this.project,source.name+' copy');return this.addFlow(flow);}
 deleteFlow(id){if(this.project.diagrams.length===1)throw Error('Keep at least one flow in the project.');const index=this.project.diagrams.findIndex(d=>d.id===id);if(index<0)throw Error('Flow not found');this.commit((d,p)=>{p.diagrams.splice(index,1);if(p.activeDiagramId===id)p.activeDiagramId=p.diagrams[Math.min(index,p.diagrams.length-1)].id;});}
}

export function transposeOrientation(d,next){
 if(next===d.settings.orientation)return;
 if(!['horizontal','vertical'].includes(next))throw Error('Invalid orientation');
 const map={left:'top',right:'bottom',top:'left',bottom:'right'};
 for(const n of d.nodes){const cx=n.x+n.width/2,cy=n.y+n.height/2;n.x=cy-n.width/2;n.y=cx-n.height/2;}
 for(const e of d.edges){e.sourcePort=map[e.sourcePort];e.destinationPort=map[e.destinationPort];}
 d.settings.orientation=next;
}
