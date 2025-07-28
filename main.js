const { app, BrowserWindow,WebContentsView, ipcMain  } = require('electron')
const { Menu } = require('electron');
const { ollama } = require('ollama');
const   { GoogleGenAI }  = require("@google/genai");
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
console.log(GEMINI_API_KEY)
//const ollama = new Ollama({ host: 'http://localhost:11434' })

let win 
let tabs = []
let rightPaneWidth = 0; // default fallback

ipcMain.on('right-pane', (event, width) => {
  rightPaneWidth = width;
});
const createWindow = () => {
    win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
        preload: `${__dirname}/preload.js`,
        webviewTag:true,
      disableHardwareAcceleration: true
    }
  })
  
  
  win.loadFile('index.html')
}



function createNewTab( url, id){
     console.log("sending URL", url);

      const view = new WebContentsView(
	{
    webPreferences: {
      contextIsolation: true,
      preload: `${__dirname}/preload.js`,

    },
    });

     
view.webContents.on('context-menu', (e, params) => {
  const menu = Menu.buildFromTemplate([
    { role: 'cut', enabled: params.editFlags.canCut },
    { role: 'copy', enabled: params.editFlags.canCopy },
    { role: 'paste', enabled: params.editFlags.canPaste },
    { type: 'separator' },
    { role: 'selectAll' },
    { type: 'separator' },
    { label: 'Inspect Element', click: () => {
        view.webContents.inspectElement(params.x, params.y);
        if (!view.webContents.isDevToolsOpened()) {
          view.webContents.openDevTools({ mode: 'undocked' }); // Use 'undocked' if bottom isn't working
        }
      } }
  ]);
  menu.popup();
});

    const bounds = win.getBounds();
  const yOffset = 60; // space for top tab bar


  view.setBounds({
    x: 0,
    y: yOffset,
    width: bounds.width - rightPaneWidth+17,
    height: bounds.height - yOffset,
  });

  // Handle resizing
  win.on("resize", () => {
    const newBounds = win.getBounds();
    view.setBounds({
      x: 0,
      y: yOffset,
      width: newBounds.width - rightPaneWidth+17,
      height: newBounds.height - yOffset,
    });
  });


  win.contentView.addChildView(view);
  //view.webContents.openDevTools({ mode: 'detach' });
  view.webContents.loadURL(url);
  tabs.push({ id, view });
  
}


ipcMain.on('switch-tab', (event, id) => {
  const tab = tabs.find(t => t.id === id);
const children = win.contentView?.getChildViews?.() || [];
children.forEach(child => win.contentView.removeChildView(child));

// Add only the selected one
if (tab.view && !tab.view.webContents.isDestroyed()) {
  win.contentView.addChildView(tab.view);
  console.log("Switched to tab ID:", id);
}else {
    console.warn(`Tab with id ${id} not found or view is invalid.`);
  }
});

ipcMain.on('close-tab', (event, id) => {
  const index = tabs.findIndex(t => t.id === id);
  if (index !== -1) {
    const tab = tabs[index];
    if (tab.view && win.contentView?.getChildViews?.().includes(tab.view)) {
      win.contentView.removeChildView(tab.view);
    }

    // 🧹 Optional: destroy the view
    if (tab.view?.webContents && !tab.view.webContents.isDestroyed()) {
      tab.view.webContents.destroy();
    }

    // 🗑️ Remove the tab from the list
    tabs.splice(index, 1);

    // ✅ Switch to the last remaining tab, if any
    if (tabs.length > 0) {
      const lastTab = tabs[tabs.length - 1];

      if (lastTab.view) {
        win.contentView.addChildView(lastTab.view);
        console.log("✅ Switched to tab:", lastTab.id);
      } else {
        console.warn("⚠️ Last tab has no view.");
      }
    } else {
      console.log("📭 No tabs left.");
    }
  } else {
    console.warn(`🚫 Tab with ID ${id} not found for removal.`);
  }
});




ipcMain.on('extract-tab-content', async (event, tabId) => {
  const tab = tabs.find(t => t.id === tabId);// however you're storing tabs
  if (tab) {
    const webContents = tab.view.webContents;
    
    const url = webContents.getURL();
    const html = await webContents.executeJavaScript('document.documentElement.outerHTML');
    const tab_content = await webContents.executeJavaScript('document.body.innerText');
    const extractedContent = `Summarize this with the given data - URL: {${url}} Content: {${tab_content}}`
    let summaryResult = "Error: Could not get summary.";

  try{
    //  const result = await ollama.chat({
    //   model : "llama3.1:8b",
    //   messages : [
    //     {role : 'system', content: "You are a smart browser assistant helping the user understand their browsing activity. Summarise the following tabs"},
    //     {role: 'user', content: extractedContent}
    //   ]
    // });
  const response = await fetch('http://localhost:11434/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  
  body: JSON.stringify({
    model : "gemma3n:e2b",
    messages: [{role : 'system', content: "You are a smart browser assistant helping the user understand their browsing activity. Summarise the following tabs"},
    {role: 'user', content: extractedContent}],
    stream: false
  }),

});


const data = await response.json();
console.log('Ollama raw response:', data);


 summaryResult = data.message?.content || "No response content.";
  //     console.log("result: ", summaryResult);

}catch(err){
      console.error("Problem with ollama fetch:", err.stack || err);
  summaryResult = "Failed to get summary from Ollama. Is the model running?";

}


 event.sender.send('tab-content-extracted', {
      id: tabId,
      url,
      html,
      summaryResult,
    });
  }
   
});

ipcMain.on('ask-ai',async (event,{askQ,tabId})=>{
    const tab = tabs.find(t => t.id === tabId);
    console.log('ask-ai: ',askQ,tabId);
  if (tab) {
    const webContents = tab.view.webContents;
    
    const url = webContents.getURL();
    const html = await webContents.executeJavaScript('document.documentElement.outerHTML');
    const tab_content = await webContents.executeJavaScript('document.body.innerText');
    const extractedContent = `With given web content, answer the user question - URL: {${url}} Content: {${tab_content} Question: {${askQ}}`
    let summaryResult = "Error: Could not get summary.";
try{
const ai= new GoogleGenAI({apiKey: GEMINI_API_KEY});
  const response = await ai.models.generateContent({
    model: "gemma-3n-e2b-it",
    contents: extractedContent ,
    // config: {
    //   systemInstruction: "You are a smart browser assistant helping the user understand their browsing activity. Answer the question",
    // },
  });
  console.log(response.text);
  
summaryResult = response.text  || "No response content.";

  }
  catch(err){
     console.error("Problem with Gemini:", err.stack || err);
  }

 event.sender.send('tab-content-extracted', {
      summaryResult,
    });
  }
   
})

ipcMain.on('ask-aicomp', async (event,{askQ,tabIds})=>{
  let all_tab_contents = "Here is the necessary content: \n";
  for (const tabId of tabIds) {
    const tab = tabs.find(t => t.id === tabId);
     if (tab) {
    const webContents = tab.view.webContents;
    const url = webContents.getURL();
    const html = await webContents.executeJavaScript('document.documentElement.outerHTML');
    const tab_content = await webContents.executeJavaScript('document.body.innerText');
    const extractedContent = `
                --- TAB ${tabId} CONTENT --- 
                - URL: {${url}} 
                Content: {${tab_content}}
                --- END OF TAB ${tabId} CONTENT ---`
    all_tab_contents+= "\n";
    all_tab_contents+= `${extractedContent}`
  }
  all_tab_contents+= "\n";
  all_tab_contents+= `Question: ${askQ}
                      Now, provide the final, detailed answer.`
}  

 let summaryResult = "Error: Could not get summary.";

 try{
const ai= new GoogleGenAI({apiKey: "AIzaSyCP0mlpy_DhFZGm08cQbALkNINW-CStAqg"});
  const response = await ai.models.generateContent({
    model: "gemma-3n-e4b-it",
    contents: all_tab_contents ,

  });
  console.log(response.text);
  
summaryResult = response.text  || "No response content.";

  }
  catch(err){
     console.error("Problem with Gemini:", err.stack || err);
  }


 event.sender.send('tab-content-extracted', {
      summaryResult,
    });
})

app.whenReady().then(() => {
    
  createWindow();
  // createNewTab("https://www.google.com",0);

  ipcMain.on('create-tab', (event,{ url, id }) => {
    console.log('Text from renderer in mainworld:', url);
   createNewTab( url, id);
  });


  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});



// try{
//   const response = await fetch('http://localhost:11434/api/chat', {
//   method: 'POST',
//   headers: {
//     'Content-Type': 'application/json',
//   },
  
//   body: JSON.stringify({
//     model : "gemma3n:e2b",
//     messages: [{role : 'system', content: "You are a smart browser assistant helping the user understand their browsing activity. Answer the question with given tab contents"},
//     {role: 'user', content: all_tab_contents}],
//     stream: false
//   }),

// });