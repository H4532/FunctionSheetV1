const STORAGE_KEY='functionSheetV1';
const departments=['F&B','Kitchen','Housekeeping','HR','Engineering & IT','Accounts'];
const taskStatuses=['Not Started','In Progress','Ready','N/A','Blocked','Cancelled'];
const SESSION_KEY='functionSheetV1Session';
const roles=['Admin','Sales Admin','Sales User','Department Head','Department User','Management Read Only'];

const blankState=()=>({
  seq:2,
  currentId:null,
  users:[],
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
function load(){
  try{
    const s=JSON.parse(localStorage.getItem(STORAGE_KEY))||blankState();
    if(!Array.isArray(s.users))s.users=[];
    if(!Array.isArray(s.recipients))s.recipients=[];
    return s;
  }catch{return blankState()}
}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function current(){return state.sheets.find(x=>x.id===state.currentId)||state.sheets[0]||null}
function sessionUser(){const id=sessionStorage.getItem(SESSION_KEY);return state.users.find(u=>u.id===id&&u.active)||null}
function isRole(...r){const u=sessionUser();return !!u&&r.includes(u.role)}
function canManageUsers(){return isRole('Admin')}
function canManageSettings(){return isRole('Admin','Sales Admin')}
function canEditSheet(){return isRole('Admin','Sales Admin','Sales User')}
function canClose(){return isRole('Admin','Sales Admin')}
function canEditDepartment(d){const u=sessionUser();return !!u&&(u.role==='Admin'||u.role==='Sales Admin'||(u.department===d&&['Department Head','Department User'].includes(u.role)))}
function canManageDepartmentTasks(d){const u=sessionUser();return !!u&&(u.role==='Admin'||u.role==='Sales Admin'||(u.department===d&&u.role==='Department Head'))}
function actor(){const u=sessionUser();return u?u.name+' ('+u.department+')':'System'}
async function digestPassword(password,salt){
  const bytes=new TextEncoder().encode(salt+'|'+password);
  const hash=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function newSalt(){const a=new Uint8Array(16);crypto.getRandomValues(a);return [...a].map(b=>b.toString(16).padStart(2,'0')).join('')}
async function makeUser(name,username,password,department,role){
  const salt=newSalt();
  return {id:uid(),name,username:username.trim().toLowerCase(),department,role,active:true,salt,passwordHash:await digestPassword(password,salt),createdAt:now()};
}
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

function updateUserUI(){
  const u=sessionUser(),box=document.getElementById('currentUserBox');
  if(box)box.innerHTML=u?'<div><b>'+esc(u.name)+'</b><span class="muted-light">'+esc(u.department)+' · '+esc(u.role)+'</span></div>':'';
  const newBtn=document.getElementById('btnNew'); if(newBtn)newBtn.style.display=canEditSheet()?'':'none';
  document.querySelector('[data-view="settings"]')?.style.setProperty('display',canManageSettings()?'':'none');
}
function authScreen(){
  const overlay=document.getElementById('authOverlay'),card=document.getElementById('authCard');
  if(state.users.length===0){
    overlay.classList.remove('hidden');
    card.innerHTML=`<h1>Function Sheet V1</h1><div class="login-logo">Holiday Inn Jeddah Corniche · First-time setup</div>
      <p>Create the first system administrator. No default password is stored in the public repository.</p>
      <div class="field"><label>Administrator name</label><input id="setupName" value="System Administrator"></div>
      <div class="field"><label>Username</label><input id="setupUsername" autocomplete="username" value="admin"></div>
      <div class="field"><label>Password</label><input id="setupPassword" type="password" autocomplete="new-password" placeholder="Create a strong password"></div>
      <div class="hint">After login, open Settings → Users to create one account for Sales, F&B, Kitchen, Housekeeping, HR, Engineering & IT, Accounts, GM/Operations, etc.</div>
      <button class="primary" onclick="initializeAdmin()">Create Administrator</button>`;
    return;
  }
  if(!sessionUser()){
    overlay.classList.remove('hidden');
    card.innerHTML=`<h1>Function Sheet V1</h1><div class="login-logo">Function & Events Operations Portal</div>
      <div class="field"><label>Username</label><input id="loginUsername" autocomplete="username" onkeydown="if(event.key==='Enter')login()"></div>
      <div class="field"><label>Password</label><input id="loginPassword" type="password" autocomplete="current-password" onkeydown="if(event.key==='Enter')login()"></div>
      <div id="loginError" class="tiny" style="color:var(--bad);min-height:18px"></div>
      <button class="primary" style="width:100%" onclick="login()">Sign in</button>`;
    return;
  }
  overlay.classList.add('hidden');updateUserUI();
}
window.initializeAdmin=async()=>{
  const name=document.getElementById('setupName').value.trim(),username=document.getElementById('setupUsername').value.trim(),password=document.getElementById('setupPassword').value;
  if(!name||!username||password.length<8)return toast('Name, username and password of at least 8 characters are required');
  const u=await makeUser(name,username,password,'Administration','Admin');state.users.push(u);save();sessionStorage.setItem(SESSION_KEY,u.id);authScreen();showView('dashboard');toast('Administrator created');
};
window.login=async()=>{
  const username=document.getElementById('loginUsername').value.trim().toLowerCase(),password=document.getElementById('loginPassword').value;
  const u=state.users.find(x=>x.active&&x.username===username);
  if(!u||await digestPassword(password,u.salt)!==u.passwordHash){document.getElementById('loginError').textContent='Invalid username or password.';return}
  sessionStorage.setItem(SESSION_KEY,u.id);authScreen();showView('dashboard');toast('Welcome '+u.name);
};
window.logout=()=>{sessionStorage.removeItem(SESSION_KEY);authScreen()};
function showView(name){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active','print-target'));
  document.querySelectorAll('#mainNav button').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
  const el=document.getElementById('view-'+name);el.classList.add('active');
  render(name);
}
document.getElementById('mainNav').addEventListener('click',e=>{if(e.target.dataset.view)showView(e.target.dataset.view)});
document.getElementById('btnNew').onclick=()=>newSheet();
document.getElementById('btnLogout').onclick=()=>logout();
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
  if(!canEditSheet())return toast('Your account cannot create Function Sheets');
  const id=uid(),sections={};departments.forEach(d=>sections[d]={notes:'',tasks:[]});
  const s={id,number:fsNo(state.seq++),revision:0,status:'Draft',createdAt:now(),updatedAt:now(),eventDescription:'',eventType:'',bookingName:'',accountName:'',contactDetails:'',venue:'',startDate:'',endDate:'',startTime:'',endTime:'',guaranteedPax:'',expectedPax:'',salesperson:'',sections,feedback:[],attachments:[],timeline:[log(actor(),'Draft created')]};
  state.sheets.unshift(s);state.currentId=id;save();showView('editor');toast('New draft created');
}
function inp(label,key,val,type='text'){return `<div class="field"><label>${label}</label><input type="${type}" data-key="${key}" value="${esc(val??'')}" ${canEditSheet()?'':'disabled'}></div>`}
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
    ${departments.map(d=>`<div class="card"><h3>${esc(d)}</h3><div class="field"><label>Requirements / Instructions</label><textarea data-section="${esc(d)}" ${canEditSheet()?'':'disabled'}>${esc(s.sections[d]?.notes||'')}</textarea></div>${canEditSheet()?'<button class="small" onclick="addTaskFromEditor(\''+esc(d)+'\')">+ Add Follow-up Task</button>':''}<div class="tiny muted" style="margin-top:8px">${(s.sections[d]?.tasks||[]).length} follow-up task(s)</div></div>`).join('')}
  </div>
  <div class="card no-print" style="margin-top:16px">
    <div class="row-actions">
      ${canEditSheet()?'<button class="primary" onclick="saveEditor()">Save</button><button onclick="submitSheet()">Submit / Distribute</button><button onclick="createRevision()">Create Revision</button><button onclick="markCancelled()" class="danger">Cancel Function</button>':''}
      <button onclick="showView('followup')">Department Follow-up</button>
      <button onclick="showView('feedback')">Post-event Feedback</button>
    </div>
  </div>
  <div class="card" style="margin-top:16px"><h3>Activity Timeline</h3>${timelineHtml(s)}</div>`;
}
window.saveEditor=()=>{
  if(!canEditSheet())return toast('Read-only access');
  const s=current();document.querySelectorAll('#view-editor [data-key]').forEach(i=>s[i.dataset.key]=i.value);
  document.querySelectorAll('#view-editor [data-section]').forEach(t=>s.sections[t.dataset.section].notes=t.value);
  s.updatedAt=now();s.timeline.unshift(log(actor(),'Function Sheet updated'));save();renderEditor();toast('Saved');
};
window.addTaskFromEditor=d=>{if(!canEditSheet())return toast('Read-only access');const name=prompt('Task / requirement name');if(!name)return;current().sections[d].tasks.push(task(name));current().timeline.unshift(log(actor(),'Task added to '+d+': '+name));save();renderEditor();toast('Task added')};
window.submitSheet=()=>{
  if(!canEditSheet())return toast('Read-only access');
  saveEditor();const s=current();s.status='Submitted';s.updatedAt=now();s.timeline.unshift(log(actor(),'Function Sheet submitted and prepared for distribution'));save();renderEditor();
  const emails=state.recipients.filter(r=>r.active&&r.email).map(r=>r.email).join(',');
  if(emails){const subject=encodeURIComponent('FUNCTION SHEET | '+s.number+' | '+s.eventDescription+' | '+fmtDate(s.startDate));const body=encodeURIComponent('A Function Sheet has been issued.\n\n'+s.number+'\nEvent: '+s.eventDescription+'\nDate: '+fmtDate(s.startDate)+'\nVenue: '+s.venue+'\nPax: '+s.expectedPax+'\n\nPlease review the live Function Sheet portal.');window.location.href='mailto:'+emails+'?subject='+subject+'&body='+body}
  toast(emails?'Submitted — email composer opened':'Submitted — add recipient emails in Settings');
};
window.createRevision=()=>{if(!canEditSheet())return toast('Read-only access');saveEditor();const s=current();s.revision++;s.status='Revised';s.updatedAt=now();s.timeline.unshift(log(actor(),'Revision '+s.revision+' created'));save();renderEditor();toast('Revision created')};
window.markCancelled=()=>{if(!canEditSheet())return toast('Read-only access');const reason=prompt('Cancellation reason');if(reason===null)return;const s=current();s.status='Cancelled';s.timeline.unshift(log(actor(),'Function cancelled'+(reason?': '+reason:'')));save();renderEditor();toast('Function cancelled')};
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
  <div class="grid cols-2">${departments.filter(d=>isRole('Admin','Sales Admin','Sales User','Management Read Only')||sessionUser()?.department===d).map(d=>departmentFollowup(s,d)).join('')}</div>
  <div class="card" style="margin-top:16px"><h3>Activity Timeline</h3>${timelineHtml(s)}</div>`;
}
function departmentFollowup(s,d){
  const tasks=s.sections[d]?.tasks||[];
  return `<div class="card department-card"><div class="section-title"><h3>${esc(d)}</h3>${canManageDepartmentTasks(d)?'<button class="small" onclick="addFollowTask(\''+esc(d)+'\')">+ Task</button>':''}</div>
    <div class="muted tiny" style="white-space:pre-wrap;margin-bottom:10px">${esc(s.sections[d]?.notes||'No requirements entered.')}</div>
    ${tasks.length?tasks.map(t=>taskHtml(d,t)).join(''):'<div class="empty">No tasks. Add a task to track preparation.</div>'}
  </div>`;
}
function taskHtml(d,t){const edit=canEditDepartment(d),manage=canManageDepartmentTasks(d);return `<div class="task"><div class="taskline">
  <div><label>Task</label><input value="${esc(t.name)}" ${manage?'':'disabled'} onchange="updateTask('${esc(d)}','${t.id}','name',this.value)"></div>
  <div><label>Status</label><select ${edit?'':'disabled'} onchange="updateTask('${esc(d)}','${t.id}','status',this.value)">${taskStatuses.map(x=>'<option '+(x===t.status?'selected':'')+'>'+x+'</option>').join('')}</select></div>
  <div><label>Estimated completion</label><input type="datetime-local" value="${esc(t.eta||'')}" ${edit?'':'disabled'} onchange="updateTask('${esc(d)}','${t.id}','eta',this.value)"></div>
  <div><label>Assigned to</label><input value="${esc(t.assignee||'')}" ${edit?'':'disabled'} onchange="updateTask('${esc(d)}','${t.id}','assignee',this.value)"></div>
  </div><div class="field" style="margin-top:8px"><label>Comment / reason / preparation note</label><textarea ${edit?'':'disabled'} onchange="updateTask('${esc(d)}','${t.id}','comment',this.value)">${esc(t.comment||'')}</textarea></div>
  ${manage?'<div class="row-actions"><button class="small danger" onclick="deleteTask(\''+esc(d)+'\',\''+t.id+'\')">Delete</button></div>':''}</div>`}
window.addFollowTask=d=>{if(!canManageDepartmentTasks(d))return toast('You cannot add tasks for this department');const name=prompt('Task / preparation item');if(!name)return;const s=current();s.sections[d].tasks.push(task(name));s.timeline.unshift(log(actor(),'Task created in '+d+': '+name));save();renderFollowup()};
window.updateTask=(d,id,key,value)=>{if(!canEditDepartment(d))return toast('You can update only your department');const s=current(),t=s.sections[d].tasks.find(x=>x.id===id);if(!t)return;t[key]=value;t.updatedAt=now();s.timeline.unshift(log(actor(),d+' · '+t.name+' — '+key+' updated to '+value));save();renderFollowup();toast('Follow-up updated')};
window.deleteTask=(d,id)=>{if(!canManageDepartmentTasks(d))return toast('You cannot delete tasks for this department');if(!confirm('Delete this task?'))return;const s=current();s.sections[d].tasks=s.sections[d].tasks.filter(x=>x.id!==id);save();renderFollowup()};

function renderFeedback(){
  const s=current(),el=document.getElementById('view-feedback');if(!s){el.innerHTML='<div class="empty">Open a Function Sheet first.</div>';return}
  el.innerHTML=`<div class="section-title"><div><h2>${esc(s.number)} · Feedback & Event Record</h2><div class="muted">${esc(s.eventDescription)}</div></div></div>
  <div class="grid cols-2">
    <div class="card"><h3>Add feedback / remark</h3>
      <div class="grid cols-2">
        <div class="field"><label>Department</label><select id="fbDept" ${isRole('Admin','Sales Admin','Sales User')?'':'disabled'}>${(isRole('Admin','Sales Admin','Sales User')?['Sales','Operations',...departments]:[sessionUser()?.department||'']).map(d=>'<option>'+esc(d)+'</option>').join('')}</select></div>
        <div class="field"><label>Category</label><select id="fbCategory"><option>Guest / Client Feedback</option><option>Operational Remark</option><option>Incident / Issue</option><option>Lessons Learned</option><option>Improvement Suggestion</option><option>Material / Equipment</option><option>Finance</option></select></div>
      </div>
      <div class="field"><label>Remark</label><textarea id="fbText" placeholder="Record what happened, feedback received, issue, lesson learned, material used..."></textarea></div>
      <div class="field"><label>Files / photos / videos</label><input id="fbFiles" type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"></div>
      <button class="primary" onclick="addFeedback()">Add to permanent record</button>
    </div>
    <div class="card"><h3>Event closure</h3><p class="muted">Close the function only after departmental follow-up and post-event remarks are reviewed.</p>${canClose()?'<div class="row-actions"><button onclick="closeFunction()">Close Function</button><button onclick="reopenFunction()">Reopen</button></div>':'<div class="locked-note">Closure is available to Sales Admin / Admin.</div>'}</div>
  </div>
  <div class="card" style="margin-top:16px"><h3>Post-event record</h3>${feedbackHtml(s)}</div>
  <div class="card" style="margin-top:16px"><h3>Attachments</h3>${attachmentsHtml(s)}</div>`;
}
function feedbackHtml(s){if(!s.feedback?.length)return '<div class="empty">No post-event feedback yet.</div>';return s.feedback.map(f=>`<div class="task"><b>${esc(f.category)}</b> · <span class="badge">${esc(f.department)}</span><p style="white-space:pre-wrap">${esc(f.text)}</p><div class="tiny muted">${fmtDT(f.at)} · ${esc(f.by||'User')}</div></div>`).join('')}
function attachmentsHtml(s){if(!s.attachments?.length)return '<div class="empty">No attachments yet.</div>';return s.attachments.map(a=>`<div class="attachment"><div><b>${esc(a.name)}</b><div class="tiny muted">${esc(a.type)} · ${Math.round((a.size||0)/1024)} KB · ${fmtDT(a.at)}</div></div>${a.data?'<a href="'+a.data+'" download="'+esc(a.name)+'">Open / Download</a>':'<span class="tiny muted">Metadata only</span>'}</div>`).join('')}
window.addFeedback=async()=>{
  const s=current(),text=document.getElementById('fbText').value.trim();if(!text)return toast('Enter a remark first');
  const department=document.getElementById('fbDept').value,category=document.getElementById('fbCategory').value;
  s.feedback.unshift({id:uid(),department,category,text,at:now(),by:actor()});
  const files=[...document.getElementById('fbFiles').files];
  for(const f of files){let data=''; if(f.size<=2*1024*1024){data=await fileData(f)} s.attachments.unshift({id:uid(),name:f.name,type:f.type,size:f.size,at:now(),data})}
  s.timeline.unshift(log(actor(),'Post-event '+category+' added'+(files.length?' with '+files.length+' attachment(s)':'')));
  save();renderFeedback();toast('Feedback recorded');
};
function fileData(f){return new Promise(res=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>res('');r.readAsDataURL(f)})}
window.closeFunction=()=>{if(!canClose())return toast('Only Sales Admin / Admin can close functions');const s=current();s.status='Completed';s.timeline.unshift(log(actor(),'Function closed and archived'));save();renderFeedback();toast('Function closed')};
window.reopenFunction=()=>{if(!canClose())return toast('Only Sales Admin / Admin can reopen functions');const reason=prompt('Reason for reopening');if(reason===null)return;const s=current();s.status='Submitted';s.timeline.unshift(log(actor(),'Function reopened'+(reason?': '+reason:'')));save();renderFeedback();toast('Function reopened')};

function renderSettings(){
  const el=document.getElementById('view-settings');
  if(!canManageSettings()){el.innerHTML='<div class="empty">Settings are available to Admin and Sales Admin.</div>';return}
  el.innerHTML=`
  ${canManageUsers()?`<div class="section-title"><div><h2>Users & Department Access</h2><div class="muted">Create one or more users per department and assign their role.</div></div><button class="primary" onclick="addUserPrompt()">+ Add User</button></div>
  <div class="card"><div style="overflow:auto"><table><thead><tr><th>Name</th><th>Username</th><th>Department</th><th>Role</th><th>Enabled</th><th>Password</th><th></th></tr></thead><tbody>
    ${state.users.map(u=>`<tr><td><input value="${esc(u.name)}" onchange="updateUser('${u.id}','name',this.value)"></td><td><input value="${esc(u.username)}" onchange="updateUser('${u.id}','username',this.value.toLowerCase())"></td><td><select onchange="updateUser('${u.id}','department',this.value)">${['Administration','Sales','Operations','GM',...departments].map(d=>'<option '+(d===u.department?'selected':'')+'>'+esc(d)+'</option>').join('')}</select></td><td><select onchange="updateUser('${u.id}','role',this.value)">${roles.map(r=>'<option '+(r===u.role?'selected':'')+'>'+r+'</option>').join('')}</select></td><td><input type="checkbox" ${u.active?'checked':''} onchange="updateUser('${u.id}','active',this.checked)"></td><td><button class="small" onclick="resetUserPassword('${u.id}')">Reset</button></td><td><button class="small danger" onclick="deleteUser('${u.id}')">Delete</button></td></tr>`).join('')}
  </tbody></table></div></div>`:''}

  <div class="section-title" style="margin-top:20px"><div><h2>Distribution Recipients</h2><div class="muted">Email routing used when Sales submits a Function Sheet.</div></div><button class="primary" onclick="addRecipient()">+ Add Recipient</button></div>
  <div class="card"><div style="overflow:auto"><table><thead><tr><th>Department</th><th>Name</th><th>Email</th><th>Type</th><th>Enabled</th><th></th></tr></thead><tbody>
    ${state.recipients.map(r=>`<tr><td><input value="${esc(r.department)}" onchange="updateRecipient('${r.id}','department',this.value)"></td><td><input value="${esc(r.name)}" onchange="updateRecipient('${r.id}','name',this.value)"></td><td><input type="email" value="${esc(r.email)}" onchange="updateRecipient('${r.id}','email',this.value)"></td><td><select onchange="updateRecipient('${r.id}','type',this.value)"><option ${r.type==='TO'?'selected':''}>TO</option><option ${r.type==='CC'?'selected':''}>CC</option><option ${r.type==='BCC'?'selected':''}>BCC</option></select></td><td><input type="checkbox" ${r.active?'checked':''} onchange="updateRecipient('${r.id}','active',this.checked)"></td><td><button class="small danger" onclick="deleteRecipient('${r.id}')">Delete</button></td></tr>`).join('')}
  </tbody></table></div></div>
  <div class="card" style="margin-top:16px"><h3>Data & backup</h3><p class="muted">V1 stores data in this browser. Passwords are stored as salted SHA-256 hashes, not plain text. For true multi-user production use, move authentication/data to a server database or Entra ID.</p><div class="row-actions"><button onclick="exportData()">Export JSON</button><label style="display:inline-block"><input id="importFile" type="file" accept=".json" onchange="importData(this.files[0])"></label><button class="danger" onclick="resetDemo()">Reset Demo Data</button></div></div>`;
}
window.addUserPrompt=async()=>{
  if(!canManageUsers())return;
  const name=prompt('Full name');if(!name)return;
  const username=prompt('Username');if(!username)return;
  if(state.users.some(u=>u.username===username.trim().toLowerCase()))return toast('Username already exists');
  const department=prompt('Department (Sales, F&B, Kitchen, Housekeeping, HR, Engineering & IT, Accounts, GM, Operations)','Sales')||'Sales';
  const role=prompt('Role: Admin / Sales Admin / Sales User / Department Head / Department User / Management Read Only',department==='Sales'?'Sales User':'Department User')||'Department User';
  if(!roles.includes(role))return toast('Invalid role');
  const password=prompt('Temporary password (minimum 8 characters)');if(!password||password.length<8)return toast('Password must be at least 8 characters');
  state.users.push(await makeUser(name,username,password,department,role));save();renderSettings();toast('User created');
};
window.updateUser=(id,key,val)=>{
  if(!canManageUsers())return;
  const u=state.users.find(x=>x.id===id);if(!u)return;
  if(key==='username'){val=String(val).trim().toLowerCase();if(state.users.some(x=>x.id!==id&&x.username===val))return toast('Username already exists')}
  u[key]=val;save();renderSettings();toast('User updated');
};
window.resetUserPassword=async id=>{
  if(!canManageUsers())return;const u=state.users.find(x=>x.id===id);if(!u)return;
  const p=prompt('New password for '+u.name+' (minimum 8 characters)');if(!p||p.length<8)return toast('Password not changed');
  u.salt=newSalt();u.passwordHash=await digestPassword(p,u.salt);save();toast('Password reset');
};
window.deleteUser=id=>{
  if(!canManageUsers())return;
  const me=sessionUser();if(me?.id===id)return toast('You cannot delete your own active account');
  if(!confirm('Delete this user?'))return;state.users=state.users.filter(x=>x.id!==id);save();renderSettings();
};
window.addRecipient=()=>{if(!canManageSettings())return;state.recipients.push({id:uid(),department:'',name:'',email:'',type:'TO',active:true});save();renderSettings()};
window.updateRecipient=(id,key,val)=>{if(!canManageSettings())return;const r=state.recipients.find(x=>x.id===id);if(r)r[key]=val;save();toast('Recipient saved')};
window.deleteRecipient=id=>{if(!canManageSettings())return;state.recipients=state.recipients.filter(x=>x.id!==id);save();renderSettings()};
window.exportData=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='FunctionSheetV1-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(a.href)};
window.importData=async f=>{if(!f)return;try{state=JSON.parse(await f.text());save();renderSettings();toast('Data imported')}catch{toast('Invalid backup file')}};
window.resetDemo=()=>{if(!canManageUsers())return;if(!confirm('Reset all local data?'))return;state=blankState();save();sessionStorage.removeItem(SESSION_KEY);authScreen()};

window.showView=showView;
authScreen();
if(sessionUser())showView('dashboard');