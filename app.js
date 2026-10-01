const STORAGE_KEY='functionSheetV1';
const departments=['F&B','Kitchen','Housekeeping','HR','Engineering & IT','Accounts'];
const taskStatuses=['Not Started','In Progress','Ready','N/A','Blocked','Cancelled'];

const blankState=()=>({
  seq:2,
  currentId:null,
  recipients:[
    {id:uid(),department:'GM',name:'General Manager',email:'',type:'TO',active:true},
    {id:uid(),department:'Sales',name:'Sales Team',email:'',type:'TO',active:true},
    ...departments.map(d=>({id:uid(),department:d,name:d+' Manager',email:'',type:'TO',active:true}))
  ],
  sheets:[sampleSheet()]
});

function uid(){return Math.random().toString(36).slice(2)+Date.now().toString(36)}
function now(){return new Date().toISOString()}
function fsNo(n){return 'FS-'+new Date().getFullYear()+'-'+String(n).padStart(4,'0')}
function sampleSheet(){
  const id=uid();
  const sections={};
  departments.forEach(d=>sections[d]={notes:d==='F&B'?'02/10/2026 11:00 AM–3:00 PM\n03/10/2026 11:00 AM–3:00 PM\nWater':d==='Housekeeping'?'Be ready at 12:00 PM':d==='Accounts'?'SR.500 + 15% VAT × 2 days = SR.1150\nReceived 1150 SAR':'',tasks:[]});
  sections['F&B'].tasks=[task('Water service')];
  sections['Housekeeping'].tasks=[task('Room ready by 12:00 PM')];
  return {
    id,number:'FS-2026-0001',revision:0,status:'Submitted',createdAt:now(),updatedAt:now(),
    eventDescription:'Meeting and Lunch',eventType:'Meeting',bookingName:'United Arab Emirates Football Association',
    accountName:'United Arab Emirates Football Association',contactDetails:'',venue:'Corniche 2',
    startDate:'2026-10-02',endDate:'2026-10-03',startTime:'11:00',endTime:'15:00',guaranteedPax:35,expectedPax:35,
    salesperson:'Sales',sections,feedback:[],attachments:[],timeline:[log('System','Sample Function Sheet created from the provided form')],
  };
}
function task(name){return{id:uid(),name,status:'Not Started',eta:'',assignee:'',comment:'',updatedAt:now()}}
function log(by,text){return{id:uid(),at:now(),by,text}}

let state=load();
function load(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||blankState()}catch{return blankState()}}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function current(){return state.sheets.find(x=>x.id===state.currentId)||state.sheets[0]||null}
function esc(v=''){return String(v).replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]))}
function fmtDate(v){if(!v)return '—';const d=new Date(v+'T00:00:00');return d.toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'})}
function fmtDT(v){return v?new Date(v).toLocaleString():'—'}
function toast(msg){const el=document.getElementById('toast');el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2200)}
function readiness(s){
  const tasks=departments.flatMap(d=>s.sections?.[d]?.tasks||[]);
  if(!tasks.length)return 0;
  return Math.round(tasks.filter(t=>['Ready','N/A','Cancelled'].includes(t.status)).length/tasks.length*100);
}
function overall(s){
  if(s.status==='Cancelled')return 'Cancelled';
  const tasks=departments.flatMap(d=>s.sections?.[d]?.tasks||[]);
  if(tasks.some(t=>t.status==='Blocked'))return 'Blocked';
  if(tasks.length&&tasks.every(t=>['Ready','N/A','Cancelled'].includes(t.status)))return 'Ready';
  if(tasks.some(t=>t.status==='In Progress'||t.status==='Ready'))return 'In Progress';
  return s.status;
}
function badge(v){const c=v==='Ready'||v==='Completed'?'ok':v==='Blocked'||v==='Cancelled'?'bad':v==='In Progress'?'warn':'blue';return '<span class="badge '+c+'">'+esc(v)+'</span>'}

function showView(name){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active','print-target'));
  document.querySelectorAll('#mainNav button').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
  const el=document.getElementById('view-'+name);el.classList.add('active');
  render(name);
}
document.getElementById('mainNav').addEventListener('click',e=>{if(e.target.dataset.view)showView(e.target.dataset.view)});
document.getElementById('btnNew').onclick=()=>newSheet();
document.getElementById('btnPrint').onclick=()=>{const active=document.querySelector('.view.active');active.classList.add('print-target');window.print();};

function render(name){({dashboard:renderDashboard,editor:renderEditor,history:renderHistory,followup:renderFollowup,feedback:renderFeedback,settings:renderSettings}[name]||renderDashboard)()}

function renderDashboard(){
  const el=document.getElementById('view-dashboard');
  const today=new Date().toISOString().slice(0,10);
  const upcoming=state.sheets.filter(s=>s.endDate>=today&&s.status!=='Cancelled').sort((a,b)=>a.startDate.localeCompare(b.startDate));
  el.innerHTML=`
    <div class="section-title"><h2>Operations Dashboard</h2><span class="muted tiny">${new Date().toLocaleString()}</span></div>
    <div class="grid cols-4">
      <div class="card metric"><div class="value">${state.sheets.length}</div><div class="label">All Function Sheets</div></div>
      <div class="card metric"><div class="value">${upcoming.filter(s=>s.startDate===today).length}</div><div class="label">Today</div></div>
      <div class="card metric"><div class="value">${state.sheets.filter(s=>overall(s)==='Blocked').length}</div><div class="label">Blocked / Attention</div></div>
      <div class="card metric"><div class="value">${state.sheets.filter(s=>s.status==='Cancelled').length}</div><div class="label">Cancelled</div></div>
    </div>
    <div class="card" style="margin-top:16px">
      <h3>Upcoming Functions</h3>
      ${sheetTable(upcoming.slice(0,20),true)}
    </div>`;
}
function sheetTable(list,withReady=false){
  if(!list.length)return '<div class="empty">No Function Sheets found.</div>';
  return `<div style="overflow:auto"><table><thead><tr><th>FS #</th><th>Event</th><th>Date</th><th>Venue</th><th>Pax</th><th>Status</th>${withReady?'<th>Readiness</th>':''}<th></th></tr></thead><tbody>
    ${list.map(s=>`<tr><td><b>${esc(s.number)}</b><div class="tiny muted">Rev ${s.revision}</div></td><td>${esc(s.eventDescription)}<div class="tiny muted">${esc(s.accountName)}</div></td><td>${fmtDate(s.startDate)}${s.endDate&&s.endDate!==s.startDate?' – '+fmtDate(s.endDate):''}<div class="tiny muted">${esc(s.startTime)}–${esc(s.endTime)}</div></td><td>${esc(s.venue)}</td><td>${esc(s.expectedPax)}</td><td>${badge(overall(s))}</td>${withReady?'<td><div class="progress"><span style="width:'+readiness(s)+'%"></span></div><div class="tiny muted">'+readiness(s)+'%</div></td>':''}<td><button class="small" onclick="openSheet('${s.id}')">Open</button></td></tr>`).join('')}
  </tbody></table></div>`;
}
window.openSheet=id=>{state.currentId=id;save();showView('editor')};

function newSheet(){
  const id=uid(),sections={};departments.forEach(d=>sections[d]={notes:'',tasks:[]});
  const s={id,number:fsNo(state.seq++),revision:0,status:'Draft',createdAt:now(),updatedAt:now(),eventDescription:'',eventType:'',bookingName:'',accountName:'',contactDetails:'',venue:'',startDate:'',endDate:'',startTime:'',endTime:'',guaranteedPax:'',expectedPax:'',salesperson:'',sections,feedback:[],attachments:[],timeline:[log('Sales','Draft created')]};
  state.sheets.unshift(s);state.currentId=id;save();showView('editor');toast('New draft created');
}
function inp(label,key,val,type='text'){return `<div class="field"><label>${label}</label><input type="${type}" data-key="${key}" value="${esc(val??'')}"></div>`}
function renderEditor(){
  const s=current(),el=document.getElementById('view-editor');if(!s){el.innerHTML='<div class="empty">Create a Function Sheet first.</div>';return}
  el.innerHTML=`
  <div class="card sheet-head">
    <div class="sheet-title"><div><h2 style="margin:0">${esc(s.number)} <span class="badge">Rev ${s.revision}</span></h2><div class="muted">Function Sheet</div></div><div>${badge(s.status)}</div></div>
    <div class="grid cols-3" style="margin-top:18px">
      ${inp('Event Description','eventDescription',s.eventDescription)}
      ${inp('Event Type','eventType',s.eventType)}
      ${inp('Salesperson','salesperson',s.salesperson)}
      ${inp('Booking Name','bookingName',s.bookingName)}
      ${inp('Account Name','accountName',s.accountName)}
      ${inp('Contact Details','contactDetails',s.contactDetails)}
      ${inp('Start Date','startDate',s.startDate,'date')}
      ${inp('End Date','endDate',s.endDate,'date')}
      ${inp('Venue','venue',s.venue)}
      ${inp('Start Time','startTime',s.startTime,'time')}
      ${inp('End Time','endTime',s.endTime,'time')}
      ${inp('Guaranteed Pax','guaranteedPax',s.guaranteedPax,'number')}
      ${inp('Expected Pax','expectedPax',s.expectedPax,'number')}
    </div>
  </div>
  <div class="grid cols-2" style="margin-top:16px">
    ${departments.map(d=>`<div class="card"><h3>${esc(d)}</h3><div class="field"><label>Requirements / Instructions</label><textarea data-section="${esc(d)}">${esc(s.sections[d]?.notes||'')}</textarea></div><button class="small" onclick="addTaskFromEditor('${esc(d)}')">+ Add Follow-up Task</button><div class="tiny muted" style="margin-top:8px">${(s.sections[d]?.tasks||[]).length} follow-up task(s)</div></div>`).join('')}
  </div>
  <div class="card no-print" style="margin-top:16px">
    <div class="row-actions">
      <button class="primary" onclick="saveEditor()">Save</button>
      <button onclick="submitSheet()">Submit / Distribute</button>
      <button onclick="createRevision()">Create Revision</button>
      <button onclick="markCancelled()" class="danger">Cancel Function</button>
      <button onclick="showView('followup')">Department Follow-up</button>
      <button onclick="showView('feedback')">Post-event Feedback</button>
    </div>
  </div>
  <div class="card" style="margin-top:16px"><h3>Activity Timeline</h3>${timelineHtml(s)}</div>`;
}
window.saveEditor=()=>{
  const s=current();document.querySelectorAll('#view-editor [data-key]').forEach(i=>s[i.dataset.key]=i.value);
  document.querySelectorAll('#view-editor [data-section]').forEach(t=>s.sections[t.dataset.section].notes=t.value);
  s.updatedAt=now();s.timeline.unshift(log('Sales','Function Sheet updated'));save();renderEditor();toast('Saved');
};
window.addTaskFromEditor=d=>{const name=prompt('Task / requirement name');if(!name)return;current().sections[d].tasks.push(task(name));current().timeline.unshift(log('Sales','Task added to '+d+': '+name));save();renderEditor();toast('Task added')};
window.submitSheet=()=>{
  saveEditor();const s=current();s.status='Submitted';s.updatedAt=now();s.timeline.unshift(log('Sales','Function Sheet submitted and prepared for distribution'));save();renderEditor();
  const emails=state.recipients.filter(r=>r.active&&r.email).map(r=>r.email).join(',');
  if(emails){const subject=encodeURIComponent('FUNCTION SHEET | '+s.number+' | '+s.eventDescription+' | '+fmtDate(s.startDate));const body=encodeURIComponent('A Function Sheet has been issued.\n\n'+s.number+'\nEvent: '+s.eventDescription+'\nDate: '+fmtDate(s.startDate)+'\nVenue: '+s.venue+'\nPax: '+s.expectedPax+'\n\nPlease review the live Function Sheet portal.');window.location.href='mailto:'+emails+'?subject='+subject+'&body='+body}
  toast(emails?'Submitted — email composer opened':'Submitted — add recipient emails in Settings');
};
window.createRevision=()=>{saveEditor();const s=current();s.revision++;s.status='Revised';s.updatedAt=now();s.timeline.unshift(log('Sales','Revision '+s.revision+' created'));save();renderEditor();toast('Revision created')};
window.markCancelled=()=>{const reason=prompt('Cancellation reason');if(reason===null)return;const s=current();s.status='Cancelled';s.timeline.unshift(log('Sales','Function cancelled'+(reason?': '+reason:'')));save();renderEditor();toast('Function cancelled')};
function timelineHtml(s){return '<div class="timeline">'+(s.timeline||[]).map(x=>'<div class="timeline-item"><b>'+esc(x.text)+'</b><div class="time">'+fmtDT(x.at)+' · '+esc(x.by)+'</div></div>').join('')+'</div>'}

function renderHistory(){
  const el=document.getElementById('view-history');
  el.innerHTML=`<div class="section-title"><h2>Function Sheet History</h2><span class="muted tiny">All records, including completed, revised and cancelled sheets</span></div>
  <div class="card"><div class="toolbar"><input id="historySearch" class="grow" placeholder="Search FS number, client, venue, event, salesperson, remarks..." oninput="filterHistory()"><select id="historyStatus" onchange="filterHistory()"><option value="">All statuses</option><option>Draft</option><option>Submitted</option><option>Revised</option><option>Completed</option><option>Cancelled</option></select><input type="date" id="historyFrom" onchange="filterHistory()"><input type="date" id="historyTo" onchange="filterHistory()"></div><div id="historyResults"></div></div>`;
  filterHistory();
}
window.filterHistory=()=>{
  const q=(document.getElementById('historySearch')?.value||'').toLowerCase(),status=document.getElementById('historyStatus')?.value||'',from=document.getElementById('historyFrom')?.value||'',to=document.getElementById('historyTo')?.value||'';
  const list=state.sheets.filter(s=>{
    const hay=JSON.stringify(s).toLowerCase();
    return (!q||hay.includes(q))&&(!status||s.status===status)&&(!from||s.endDate>=from)&&(!to||s.startDate<=to);
  }).sort((a,b)=>(b.startDate||'').localeCompare(a.startDate||''));
  document.getElementById('historyResults').innerHTML=sheetTable(list,true);
};

function renderFollowup(){
  const s=current(),el=document.getElementById('view-followup');if(!s){el.innerHTML='<div class="empty">Open a Function Sheet first.</div>';return}
  el.innerHTML=`<div class="section-title"><div><h2>${esc(s.number)} · Department Follow-up</h2><div class="muted">${esc(s.eventDescription)} · ${fmtDate(s.startDate)} · ${esc(s.venue)}</div></div><div><b>${readiness(s)}%</b> ready</div></div>
  <div class="progress" style="margin-bottom:16px"><span style="width:${readiness(s)}%"></span></div>
  <div class="grid cols-2">${departments.map(d=>departmentFollowup(s,d)).join('')}</div>
  <div class="card" style="margin-top:16px"><h3>Activity Timeline</h3>${timelineHtml(s)}</div>`;
}
function departmentFollowup(s,d){
  const tasks=s.sections[d]?.tasks||[];
  return `<div class="card department-card"><div class="section-title"><h3>${esc(d)}</h3><button class="small" onclick="addFollowTask('${esc(d)}')">+ Task</button></div>
    <div class="muted tiny" style="white-space:pre-wrap;margin-bottom:10px">${esc(s.sections[d]?.notes||'No requirements entered.')}</div>
    ${tasks.length?tasks.map(t=>taskHtml(d,t)).join(''):'<div class="empty">No tasks. Add a task to track preparation.</div>'}
  </div>`;
}
function taskHtml(d,t){return `<div class="task"><div class="taskline">
  <div><label>Task</label><input value="${esc(t.name)}" onchange="updateTask('${esc(d)}','${t.id}','name',this.value)"></div>
  <div><label>Status</label><select onchange="updateTask('${esc(d)}','${t.id}','status',this.value)">${taskStatuses.map(x=>'<option '+(x===t.status?'selected':'')+'>'+x+'</option>').join('')}</select></div>
  <div><label>Estimated completion</label><input type="datetime-local" value="${esc(t.eta||'')}" onchange="updateTask('${esc(d)}','${t.id}','eta',this.value)"></div>
  <div><label>Assigned to</label><input value="${esc(t.assignee||'')}" onchange="updateTask('${esc(d)}','${t.id}','assignee',this.value)"></div>
  </div><div class="field" style="margin-top:8px"><label>Comment / reason / preparation note</label><textarea onchange="updateTask('${esc(d)}','${t.id}','comment',this.value)">${esc(t.comment||'')}</textarea></div>
  <div class="row-actions"><button class="small danger" onclick="deleteTask('${esc(d)}','${t.id}')">Delete</button></div></div>`}
window.addFollowTask=d=>{const name=prompt('Task / preparation item');if(!name)return;const s=current();s.sections[d].tasks.push(task(name));s.timeline.unshift(log(d,'Task created: '+name));save();renderFollowup()};
window.updateTask=(d,id,key,value)=>{const s=current(),t=s.sections[d].tasks.find(x=>x.id===id);if(!t)return;t[key]=value;t.updatedAt=now();s.timeline.unshift(log(d,t.name+' — '+key+' updated to '+value));save();renderFollowup();toast('Follow-up updated')};
window.deleteTask=(d,id)=>{if(!confirm('Delete this task?'))return;const s=current();s.sections[d].tasks=s.sections[d].tasks.filter(x=>x.id!==id);save();renderFollowup()};

function renderFeedback(){
  const s=current(),el=document.getElementById('view-feedback');if(!s){el.innerHTML='<div class="empty">Open a Function Sheet first.</div>';return}
  el.innerHTML=`<div class="section-title"><div><h2>${esc(s.number)} · Feedback & Event Record</h2><div class="muted">${esc(s.eventDescription)}</div></div></div>
  <div class="grid cols-2">
    <div class="card"><h3>Add feedback / remark</h3>
      <div class="grid cols-2">
        <div class="field"><label>Department</label><select id="fbDept"><option>Sales</option><option>Operations</option>${departments.map(d=>'<option>'+d+'</option>').join('')}</select></div>
        <div class="field"><label>Category</label><select id="fbCategory"><option>Guest / Client Feedback</option><option>Operational Remark</option><option>Incident / Issue</option><option>Lessons Learned</option><option>Improvement Suggestion</option><option>Material / Equipment</option><option>Finance</option></select></div>
      </div>
      <div class="field"><label>Remark</label><textarea id="fbText" placeholder="Record what happened, feedback received, issue, lesson learned, material used..."></textarea></div>
      <div class="field"><label>Files / photos / videos</label><input id="fbFiles" type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"></div>
      <button class="primary" onclick="addFeedback()">Add to permanent record</button>
    </div>
    <div class="card"><h3>Event closure</h3><p class="muted">Close the function only after departmental follow-up and post-event remarks are reviewed.</p><div class="row-actions"><button onclick="closeFunction()">Close Function</button><button onclick="reopenFunction()">Reopen</button></div></div>
  </div>
  <div class="card" style="margin-top:16px"><h3>Post-event record</h3>${feedbackHtml(s)}</div>
  <div class="card" style="margin-top:16px"><h3>Attachments</h3>${attachmentsHtml(s)}</div>`;
}
function feedbackHtml(s){if(!s.feedback?.length)return '<div class="empty">No post-event feedback yet.</div>';return s.feedback.map(f=>`<div class="task"><b>${esc(f.category)}</b> · <span class="badge">${esc(f.department)}</span><p style="white-space:pre-wrap">${esc(f.text)}</p><div class="tiny muted">${fmtDT(f.at)} · ${esc(f.by||'User')}</div></div>`).join('')}
function attachmentsHtml(s){if(!s.attachments?.length)return '<div class="empty">No attachments yet.</div>';return s.attachments.map(a=>`<div class="attachment"><div><b>${esc(a.name)}</b><div class="tiny muted">${esc(a.type)} · ${Math.round((a.size||0)/1024)} KB · ${fmtDT(a.at)}</div></div>${a.data?'<a href="'+a.data+'" download="'+esc(a.name)+'">Open / Download</a>':'<span class="tiny muted">Metadata only</span>'}</div>`).join('')}
window.addFeedback=async()=>{
  const s=current(),text=document.getElementById('fbText').value.trim();if(!text)return toast('Enter a remark first');
  const department=document.getElementById('fbDept').value,category=document.getElementById('fbCategory').value;
  s.feedback.unshift({id:uid(),department,category,text,at:now(),by:department});
  const files=[...document.getElementById('fbFiles').files];
  for(const f of files){let data=''; if(f.size<=2*1024*1024){data=await fileData(f)} s.attachments.unshift({id:uid(),name:f.name,type:f.type,size:f.size,at:now(),data})}
  s.timeline.unshift(log(department,'Post-event '+category+' added'+(files.length?' with '+files.length+' attachment(s)':'')));
  save();renderFeedback();toast('Feedback recorded');
};
function fileData(f){return new Promise(res=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>res('');r.readAsDataURL(f)})}
window.closeFunction=()=>{const s=current();s.status='Completed';s.timeline.unshift(log('Sales','Function closed and archived'));save();renderFeedback();toast('Function closed')};
window.reopenFunction=()=>{const reason=prompt('Reason for reopening');if(reason===null)return;const s=current();s.status='Submitted';s.timeline.unshift(log('Sales','Function reopened'+(reason?': '+reason:'')));save();renderFeedback();toast('Function reopened')};

function renderSettings(){
  const el=document.getElementById('view-settings');
  el.innerHTML=`<div class="section-title"><div><h2>Settings · Distribution Recipients</h2><div class="muted">Sales Admin can change the email distribution list at any time.</div></div><button class="primary" onclick="addRecipient()">+ Add Recipient</button></div>
  <div class="card"><div style="overflow:auto"><table><thead><tr><th>Department</th><th>Name</th><th>Email</th><th>Type</th><th>Enabled</th><th></th></tr></thead><tbody>
    ${state.recipients.map(r=>`<tr><td><input value="${esc(r.department)}" onchange="updateRecipient('${r.id}','department',this.value)"></td><td><input value="${esc(r.name)}" onchange="updateRecipient('${r.id}','name',this.value)"></td><td><input type="email" value="${esc(r.email)}" onchange="updateRecipient('${r.id}','email',this.value)"></td><td><select onchange="updateRecipient('${r.id}','type',this.value)"><option ${r.type==='TO'?'selected':''}>TO</option><option ${r.type==='CC'?'selected':''}>CC</option><option ${r.type==='BCC'?'selected':''}>BCC</option></select></td><td><input type="checkbox" ${r.active?'checked':''} onchange="updateRecipient('${r.id}','active',this.checked)"></td><td><button class="small danger" onclick="deleteRecipient('${r.id}')">Delete</button></td></tr>`).join('')}
  </tbody></table></div></div>
  <div class="card" style="margin-top:16px"><h3>Data & backup</h3><p class="muted">V1 stores data in this browser. Use export/import for backup. For multi-user production use, connect this UI to a server database and Microsoft 365/Graph.</p><div class="row-actions"><button onclick="exportData()">Export JSON</button><label style="display:inline-block"><input id="importFile" type="file" accept=".json" onchange="importData(this.files[0])"></label><button class="danger" onclick="resetDemo()">Reset Demo Data</button></div></div>`;
}
window.addRecipient=()=>{state.recipients.push({id:uid(),department:'',name:'',email:'',type:'TO',active:true});save();renderSettings()};
window.updateRecipient=(id,key,val)=>{const r=state.recipients.find(x=>x.id===id);if(r)r[key]=val;save();toast('Recipient saved')};
window.deleteRecipient=id=>{state.recipients=state.recipients.filter(x=>x.id!==id);save();renderSettings()};
window.exportData=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='FunctionSheetV1-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(a.href)};
window.importData=async f=>{if(!f)return;try{state=JSON.parse(await f.text());save();renderSettings();toast('Data imported')}catch{toast('Invalid backup file')}};
window.resetDemo=()=>{if(!confirm('Reset all local data?'))return;state=blankState();save();showView('dashboard')};

window.showView=showView;
showView('dashboard');