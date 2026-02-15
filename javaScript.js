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
const activeTimers={};


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
            createdAt:Date.now(),
            startTime:null,
            totalTime:0,
            isRunning:false

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
function displayTasks(filterType = "all") {
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

              const div =  writeTheDiv(t);
                if(t.isRunning){
                   setTimeout(()=>{
                    startLiveUpdate(t,t.id);
                   },5) 
                }
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
       showToast("Database not initialized yet!","info");
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


function markDone(id) {
    if (!db) {
        showToast("Database not initialized yet!", "info");
        return;
    }

    const transaction = db.transaction(["tasks"], "readwrite");
    const store = transaction.objectStore("tasks");
    const request = store.get(id);

    request.onsuccess = () => {
        const task = request.result;

        if (task.status === "pending") {
            // --- الحالة أ: تحويل من قيد الانتظار إلى تم الإنجاز ---
            task.status = "done";

            if (task.isRunning) {
                // إيقاف العداد وحفظ الوقت فوراً
                const sessionDuration = Date.now() - task.startTime;
                task.totalTime = (task.totalTime || 0) + sessionDuration;
                task.isRunning = false;
                
                // تنظيف الذاكرة من العداد النشط
                if (activeTimers[id]) {
                    clearInterval(activeTimers[id]);
                    delete activeTimers[id];//important for clear for the memory
                }
                showToast("Task completed and timer saved!", "success");
            }
        } else {
           
            task.status = "pending";
            task.isRunning = false;
            showToast("Task moved back to pending", "info");
        }

        const updateRequest = store.put(task);
        updateRequest.onsuccess = () => {
            displayTasks();
            updateStats();
        };
    };
}


list.addEventListener("click", (e) => {
    const target = e.target;
    
    const actionsContainer = target.closest(".actions");

    if (!actionsContainer) return;

    const taskId = Number(actionsContainer.dataset.id);

    if (target.classList.contains('btn-delete')) {
        deleteTask(taskId);
    }
    
    if (target.classList.contains('btn-done') || target.classList.contains('btn-pending')) {
        markDone(taskId);

    }
});


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
             const div = writeTheDiv(t);
                list.prepend(div);
            });
        }
}

function writeTheDiv(t){
     const div = document.createElement('div');
                let isDone = t.status === 'done';
                
                div.classList.add("task");
                div.classList.add(isDone ? "taskDone" : "taskPending");
   div.innerHTML = `
                    <div class="task-header">
                        <h3>${t.title}</h3>
                       <div class="timer-container">
                           <span class="timer-display" id="timer-${t.id}">${formatTime(t.totalTime||0)}</span>
                            <button id="btn-timer-${t.id}" 
                                        class="btn-timer-toggle" 
                                        onclick="toggleTimer(${t.id}, event)"
                                        ${isDone ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
                                    ${t.isRunning ? '<span>⏸</span>' : '<span>▶</span>'}
                                </button>                       </div>
                        <span class="status-badge ${isDone ? 'bg-success' : 'bg-warning'}">
                            ${isDone ? '✅ Finished' : '⏳ ' + (t.status || 'pending')}
                        </span>
                    </div>
                    <p class="task-desc">${t.desc || 'No description provided.'}</p>
                    <div class="meta">
                        <span class="date-tag">#${t.id}</span>
                        
                        <span class="date-tag">
                    <small>📅</small> ${new Date(t.createdAt).toLocaleDateString('en-GB', {day: 'numeric', month: 'short'})} </span>  </div>
                    <div class="actions" data-id="${t.id}">
                        <button class="${isDone ? 'btn-pending' : 'btn-done'}"> 
                            ${isDone ? 'Mark Pending ↩️' : 'Mark Done ✔️'}
                        </button>
                        <button class="btn-delete">Delete 🗑️ </button>
                    </div>
                `;
                return div;
}

search.addEventListener('blur',()=>{
    
search.value = "";
})

function toggleTimer(id,e){
    if (!db) {
        showToast("Database not initialized yet!","info");
        return;
    }

    const transaction=db.transaction(["tasks"],"readwrite");
    const store=transaction.objectStore("tasks");
    const request= store.get(id);

    request.onsuccess = () => {
    const task = request.result;
    const btnToggel = e.target;
        if(task.status==="done"){
            showToast("Cannot start timer for a finished task!", "info");          
                 if(task.isRunning){
                task.isRunning=false;
                const sessionDuration = Date.now() - task.startTime;
                task.totalTime = (task.totalTime || 0) + sessionDuration;
                clearInterval(timerInterval);
                store.put(task);
           }
           return;
        }

    if (task.isRunning === false ) {
        // --- حالة البدء ---
        task.isRunning = true;
        btnToggel.innerHTML = '<span>⏸</span>';
        
        // سجل لحظة البداية الآن
        task.startTime = Date.now(); 
        
        startLiveUpdate(task, id);
    } else {
        // --- حالة الإيقاف ---
        task.isRunning = false;
        btnToggel.innerHTML = '<span>▶</span>';
        
        // اطرح الوقت الحالي من startTime القديم المخزن في القاعدة
        const sessionDuration = Date.now() - task.startTime;
        
        // أضف الوقت الجديد للمجموع الكلي
        task.totalTime = (task.totalTime || 0) + sessionDuration;
        
        clearInterval(activeTimers[id]);
    }
    
    // حفظ التعديلات في IndexedDB
    store.put(task);
};}


function startLiveUpdate(task,id){
if(activeTimers[id]) clearInterval(activeTimers[id]);

   const timerDisplay=document.querySelector(`#timer-${id}`)
   activeTimers[id]=setInterval(()=>{
   const elapsed=(Date.now()-task.startTime)+(task.totalTime||0) ;
  
   timerDisplay.textContent=formatTime(elapsed);
   },1000)
    
}

function formatTime(ms) {
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    // استخدام padStart لإضافة صفر على اليسار إذا كان الرقم أقل من 10
    return [hours, minutes, seconds]
        .map(v => v.toString().padStart(2, '0'))
        .join(':');
}

function updateClock() {
    const now = new Date();
    document.getElementById('live-clock').textContent = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
setInterval(updateClock, 1000);
updateClock();


async function updateWeather(){
    
      const weatherIcon = document.getElementById("weatherIcon");
    const TempMax = document.getElementById("weatherTempMax");
    const TempMin = document.getElementById("weatherTempMin");
    const humidity = document.getElementById("weatherTempHumidity");
    const cityDisplay = document.getElementById("weatherCity");

    const APIkey = "6bb7c1cb5842a6e2826320d0e191a685";

    try {
        // 1. تحديد الموقع بناءً على الـ IP
        const geoResponse = await fetch("https://ipapi.co/json/");
        const geoData = await geoResponse.json();
        const lat = geoData.lat;
        const lon = geoData.lon;
        const city = geoData.city;

        // 2. جلب بيانات الطقس باستخدام الإحداثيات
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${APIkey}`;
        const response = await fetch(url);
        const weatherData = await response.json();

        // 3. استخراج البيانات من مساراتها الصحيحة في الـ JSON
        const statusIcon = weatherData.weather[0].icon; 
        const tempMaxVal = Math.round(weatherData.main.temp_max);
        const tempMinVal = Math.round(weatherData.main.temp_min); 
        const humidityVal = weatherData.main.humidity; 
        const countryName = weatherData.sys.country;

        // 4. تحديث واجهة المستخدم (UI)
        weatherIcon.innerHTML = `<img src="https://openweathermap.org/img/wn/${statusIcon}@2x.png" alt="weather icon">`;
        TempMax.innerHTML = ` ${ tempMaxVal}°C  `;
        TempMin.innerHTML = ` ${ tempMinVal}°C  `;
        humidity.innerHTML = ` ${ humidityVal}  `;
        cityDisplay.innerHTML = ` ${city}, ${countryName}`;
}catch(error){
    showToast(error,"error");
}
        
}

updateWeather();