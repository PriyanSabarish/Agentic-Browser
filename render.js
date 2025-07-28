let tabIdCounter = 0;
let currentTabId = null;
let tabs=[]

const openTabButton = document.getElementById('new-tab');
const clickbtn = document.getElementById('clicktab');
clickbtn.onclick = () =>{
if (currentTabId !== null) {
 
    window.electronAPI.extractTabContent(currentTabId);
  }
}


const askbtn = document.getElementById('ask-btn');



askbtn.onclick = () =>{
  if (currentTabId !== null) {
     const content = document.getElementById('userReq');
     const userreq = content.value.trim();
      if (userreq.includes('/tab')) {
      tabs=[]
      let  position = userreq.indexOf('/tab');
        while (position !== -1) {
          tabs.push(userreq.charAt(position+4));
          position = userreq.indexOf('/tab', position + 5);
        }
      tabs = [...userreq.matchAll(/\/tab(\d+)/g)].map(match => parseInt(match[1]));
      console.log(tabs)    
      window.electronAPI.askaicomp({ askQ: userreq, tabIds: tabs });
      }else{
        
      console.log('Sending to main:', userreq);     
      window.electronAPI.askai({ askQ: userreq, tabId: currentTabId });
      }

  }
}







window.electronAPI.onContentExtracted((data) => {
  const {  summaryResult } = data;
  document.getElementById('output-text').textContent = summaryResult;
});



function addNewTab(tabname, id) {
  const tab = document.createElement('div');
  tab.classList.add('tab');
  tab.dataset.id = id;
  currentTabId = id; 
  // container for the tab name
  const titleDiv = document.createElement('div');
  titleDiv.textContent = tabname;

  // close button
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.classList.add('close');

  // Append title and close button to the tab div
  tab.appendChild(titleDiv);
  tab.appendChild(closeBtn);

  // switch tab event
  tab.onclick = () => {
    window.electronAPI.switchTab(id);

    currentTabId = id; 
    highlightTab(id);
  };

  // Close button event
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    window.electronAPI.closeTab(id);
    tab.remove();
  };


  document.getElementById('tabBar').appendChild(tab);
}


function highlightTab(id) {
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.remove('active');
    if (t.dataset.tabId == id) t.classList.add('active');
  });
}

openTabButton.addEventListener("click",()=>{
    // const inputElement = document.getElementById("myInput");
    // const value = inputElement.value.trim();
    
    const url = document.getElementById("myInput");
    const value = url.value.trim();
    console.log("button clicked,",value);
    if (value) {
        const id = tabIdCounter++;
        console.log(value);
g
          const url = value.startsWith('http://') || value.startsWith('https://') ? value : `https://${value}`;
          addNewTab(`Tab ${id}`, id);
          window.electronAPI.createTab({url,id}); 
          // if (currentTabId !== null) {
          // window.electronAPI.extractTabContent(id);
          // }
          highlightTab(id);
        }
})


        

window.addEventListener('DOMContentLoaded', () => {
  const rightPane = document.getElementById('right-pane');
  if (rightPane) {
    const width = rightPane.offsetWidth;
    window.electronAPI.rightpane(width);
  }
});
