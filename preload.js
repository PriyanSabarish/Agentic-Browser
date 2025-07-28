const { contextBridge, ipcRenderer } = require('electron');



 contextBridge.exposeInMainWorld('electronAPI', {
  createTab: (urlFromRenderer) => {
    ipcRenderer.send('create-tab', urlFromRenderer); 
  },
  askai :({askQ,tabId}) =>{ipcRenderer.send('ask-ai',{askQ,tabId})},
  askaicomp : ({askQ,tabIds}) =>{ipcRenderer.send('ask-aicomp',{askQ,tabIds})},
  rightpane: (width) => ipcRenderer.send('right-pane', width),
   switchTab: (id) => ipcRenderer.send('switch-tab', id),
  closeTab: (id) => ipcRenderer.send('close-tab', id),
   extractTabContent: (tabId) => ipcRenderer.send('extract-tab-content', tabId),
  onContentExtracted: (callback) => ipcRenderer.on('tab-content-extracted', (event, data) => callback(data)), 
 });
contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
  ping: () => ipcRenderer.invoke('ping')

})