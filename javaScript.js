//  ✅ LEFT: Add Task form



const titleInput=document.getElementById("title");
const descInput=document.getElementById("desc");
const toast=document.getElementById("toast");
const btnAdd=document.getElementById("btnAdd");
const btnReset=document.getElementById("btnReset");
const shown=document.getElementById("shown");
const list=document.getElementById("list");
const btnClearAll=document.getElementById("btnClearAll");
const stats=document.getElementById("stats");
const search=document.getElementById("search");


 //Creat IndexedDB 
 let db;
 const request=indexedDB.open("TaskManagerDB",1);

//For open the first 
request.onupgradeneeded = (event) => {
    db = event.target.result;
    if (!db.objectStoreNames.contains("tasks")) {
        db.createObjectStore("tasks", { keyPath: "id", autoIncrement: true });
    }
};

request.onsuccess = (event) => {
    db = event.target.result;
    showToast("Database opened successfully","info");
     displayTasks();
     updateStats();
};

request.onerror = (event) => {
    showToast("Error opening DB","error");
};


btnAdd.addEventListener('click',(e)=>{
e.preventDefault();
if (titleInput.value.trim() !== "" && titleInput.value.trim().length >= 3) {
    const dateNow=new Date();
        saveTasks({
            title: titleInput.value, 
            desc: descInput.value,
            status: 'pending' ,
            createdAt:dateNow.toLocaleString()
        });
    } else {
        showToast("Please enter a title (min 3 chars)");
    }
})

btnReset.addEventListener('click',()=>{
     titleInput.value = "";
        descInput.value = "";
})


//Show the message
function showToast(message, type="info"){
    switch(type){
     case "success":
            toast.textContent = "✅ " + message;
            toast.style.backgroundColor = "#22c55e"; 
            break;
        case "error":
            toast.textContent = "❌ " + message;
            toast.style.backgroundColor = "#ef4444";
            break;
        default:
            toast.textContent = "ℹ️ " + message;
            toast.style.backgroundColor = "#333"; 
    }
   toast.style.display = "block";
    toast.style.opacity = "1";

    
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => {
            toast.style.display = "none";
        }, 500);
    }, 3000);
}

//Save the task
function saveTasks(task) {
    const transaction = db.transaction(["tasks"], "readwrite");
    const store = transaction.objectStore("tasks");
    const addTask = store.add(task);

    addTask.onsuccess = () => {
        showToast("Added successfully","success");
        titleInput.value = "";
        descInput.value = "";
        displayTasks(); //Instant update
    };

    addTask.onerror = () => {
        showToast("Field add task","error");
    };
}

//Display task
async function displayTasks(filterType = "all") {
    if (!db) return;

    const transaction = db.transaction(["tasks"], "readonly");
    const store = transaction.objectStore("tasks");
    const request = store.getAll();

    list.innerHTML = "";

    request.onsuccess = () => {
        let tasks = request.result;
        filterType=filterType.toLowerCase();
         if(filterType!=='all'){
                tasks = tasks.filter(t => t.status === filterType);
           }
        shown.textContent = "# " + tasks.length + " shown.";

        if (tasks.length === 0) {
            const div = document.createElement("div");
            div.classList.add("messageList");
            div.textContent = "No tasks match your filter/search.";
            
            btnClearAll.disabled = true;
            btnClearAll.style.cursor = "not-allowed";
            btnClearAll.style.opacity = "0.5";

            list.appendChild(div);
        } 
        else {
            btnClearAll.disabled = false;
            btnClearAll.style.cursor = "pointer";
            btnClearAll.style.opacity = "1";

            tasks.forEach(t => {
                const div = document.createElement('div');
                let isDone = t.status === 'done';
                
                div.classList.add("task");
                div.classList.add(isDone ? "taskDone" : "taskPending");

                div.innerHTML = `
                    <div class="task-header">
                        <h3>${t.title}</h3>
                        <span class="status-badge ${isDone ? 'bg-success' : 'bg-warning'}">
                            ${isDone ? '✅ Finished' : '⏳ ' + (t.status || 'pending')}
                        </span>
                    </div>
                    <p class="task-desc">${t.desc || 'No description provided.'}</p>
                    <div class="meta">
                        <span class="date-tag">#${t.id}</span>
                        <span class="date-tag">🗓️ ${new Date(t.createdAt).toLocaleDateString('en-GB', {day: 'numeric', month: 'short'})}</span>
                    </div>
                    <div class="actions" data-id="${t.id}">
                        <button class="${isDone ? 'btn-pending' : 'btn-done'}"> 
                            ${isDone ? 'Mark Pending ↩️' : 'Mark Done ✔️'}
                        </button>
                        <button class="btn-delete">Delete 🗑️ </button>
                    </div>
                `;
                list.prepend(div);
            });
        }
    };

    request.onerror = () => {
        showToast("Error loading tasks", "error");
    };
}

function deleteTask(id){
  if (!db) {
        console.error("Database not initialized yet!");
        return;
    }

    if (confirm("Are you sure to delete this task ?")) {
       
        const transaction = db.transaction(["tasks"], "readwrite"); 
        const store = transaction.objectStore("tasks");
        
        const deleteReq = store.delete(id);

        deleteReq.onsuccess = () => {
            showToast("Deleted!", "success");
            displayTasks();
            updateStats();
        };
      request.onerror = () => {
            showToast("Error during deletion", "error");
        };
        
    } else 
        {
        showToast("Deletion cancelled", "info");
    }

}


function markDone(id){
     if (!db) {
        console.error("Database not initialized yet!");
        return;
    }

    const transaction=db.transaction(["tasks"],"readwrite");
    const store=transaction.objectStore("tasks");
    const request= store.get(id);

    request.onsuccess=()=>{
    
    const task=request.result;
     
    if(task.status==="pending"){ 
        task.status="done";

    }else{
    task.status="pending";
   }

   const updateTaskStatu=store.put(task);
   
   updateTaskStatu.onsuccess=()=>{
    displayTasks();
    updateStats();
   }
   }
    
} 


list.addEventListener("click",(e)=>{
    const target=e.target;
    const taskId=Number(target.closest(".actions").dataset.id);

    if(target.classList.contains('btn-delete')){
        deleteTask(taskId);
    }
   if (target.classList.contains('btn-done') || target.classList.contains('btn-pending')) {
            markDone(taskId);
        }
})


//For Tip: Press Ctrl + Enter to add quickly.
function initShortcuts(){
    const inputs=document.querySelectorAll("#title,#desc");

inputs.forEach(field=>{
    field.addEventListener('keydown',(e)=>{
        if(e.ctrlKey&&e.key==="Enter"){
            e.preventDefault();

            if (!inputs[0].value.trim()) {
                alert("Please enter a title first!");
                return;
            }
            const task={
            title: inputs[0].value, 
            desc: inputs[1].value,
            status: 'pending' ,
            createdAt:new Date().toLocaleString()
            }
           saveTasks(task) ;
           inputs[0].value = "";
           inputs[1].value = "";
           inputs[0].focus();
        }
    })
})  
}

initShortcuts();


btnClearAll.addEventListener('click',()=>{
   if(confirm("Are you sure you want to delete the all tasks?")){
         const transaction=db.transaction(["tasks"],"readwrite");
         const store=transaction.objectStore("tasks");
         const request= store.clear();


     request.onsuccess=()=>{
         showToast("All the tasks are deleted.","info");
         displayTasks();
    }

    request.onerror=()=>{
        showToast("Error to detete .","error");
    }
}else{
     showToast("Deletion cancelled", "info");
}
});


function initFilters() {

   const filterButtons=document.querySelectorAll('[data-filter]');
   filterButtons.forEach(btn=>{
    btn.addEventListener('click',()=>{
        const filterValue = btn.getAttribute("data-filter").toLowerCase();
        displayTasks(filterValue);
       
          filterButtons.forEach(b=>b.classList.remove("active"));
          btn.classList.add("active");
    })
})
}


initFilters();


function updateStats(){

 if (!db) return;

    const transaction = db.transaction(["tasks"], "readonly");
    const store = transaction.objectStore("tasks");
    const request = store.getAll();

    list.innerHTML = "";

    request.onsuccess = () => {
        let tasks = request.result;
        
       const pendingTask= tasks.filter(t => t.status === 'pending');
       const doneTask= tasks.filter(t => t.status === 'done');

    stats.textContent=`Total: ${pendingTask.length+doneTask.length} • Pending: ${pendingTask.length}  • Done: ${doneTask.length} `;
}

 
}

search.addEventListener('input',(e)=>{
    const value=e.target.value;

    if (!db) return;

    const transaction = db.transaction(["tasks"], "readonly");
    const store = transaction.objectStore("tasks");
    const request = store.getAll();

    request.onsuccess=(e)=>{
    const allTasks = e.target.result;  
    if (!allTasks) return;
    const filterCase = allTasks.filter(task => 
    task.title.toLowerCase().includes(value.toLowerCase()));  

    renderFilteredTasks(filterCase);

    }

})


function renderFilteredTasks(filterCase){
        list.innerHTML=``;
         debugger;
        shown.textContent = "# " + filterCase.length + " shown.";

        if (filterCase.length === 0) {
            const div = document.createElement("div");
            div.classList.add("messageList");
            div.textContent = "No tasks match your filter/search.";
            
            btnClearAll.disabled = true;
            btnClearAll.style.cursor = "not-allowed";
            btnClearAll.style.opacity = "0.5";

            list.appendChild(div);
        } 
        else {
            btnClearAll.disabled = false;
            btnClearAll.style.cursor = "pointer";
            btnClearAll.style.opacity = "1";

            filterCase.forEach(t => {
                const div = document.createElement('div');
                let isDone = t.status === 'done';
                
                div.classList.add("task");
                div.classList.add(isDone ? "taskDone" : "taskPending");

                div.innerHTML = `
                    <div class="task-header">
                        <h3>${t.title}</h3>
                        <span class="status-badge ${isDone ? 'bg-success' : 'bg-warning'}">
                            ${isDone ? '✅ Finished' : '⏳ ' + (t.status || 'pending')}
                        </span>
                    </div>
                    <p class="task-desc">${t.desc || 'No description provided.'}</p>
                    <div class="meta">
                        <span class="date-tag">#${t.id}</span>
                        <span class="date-tag">🗓️ ${new Date(t.createdAt).toLocaleDateString('en-GB', {day: 'numeric', month: 'short'})}</span>
                    </div>
                    <div class="actions" data-id="${t.id}">
                        <button class="${isDone ? 'btn-pending' : 'btn-done'}"> 
                            ${isDone ? 'Mark Pending ↩️' : 'Mark Done ✔️'}
                        </button>
                        <button class="btn-delete">Delete 🗑️ </button>
                    </div>
                `;
                list.prepend(div);
            });
        }
}

search.addEventListener('blur',()=>{
    
search.value = "";
})

