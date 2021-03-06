/*
 *  Copyright 2018 Luke Klinker
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

const { app, Tray, Menu, dialog, crashReporter } = require('electron')
const { autoUpdater } = require("electron-updater")

const storage = require('electron-json-storage')
const windowProvider = require('./resources/js/window-provider.js')
const webSocket = require('./resources/js/websocket.js')
const menu = require('./resources/js/menu.js')
const preferences = require('./resources/js/preferences.js')

let mainWindow = null
let tray = null

var shouldQuit = app.makeSingleInstance((commandLine, workingDirectory) => {
  windowProvider.getWindow().show()
  setTimeout(() => {
    windowProvider.getBrowserView().webContents.executeJavaScript("try { reloadUpdatedConversations() } catch (err) { }")
  }, 1000)
})

if (shouldQuit) {
  app.quit()
  return
}

app.setAppUserModelId("xyz.klinker.messenger")
app.on('ready', createWindow)
app.on('activate', createWindow)

app.on('window-all-closed', () => {
  // used to close the app and the web socket here for non-macOS devices
  // We don't want to do that anymore, since we are able to save and restore
  // the app state.
})

app.on('before-quit', () => {
  // might cause issues in the future as before-quit and will-quit events are not called
  webSocket.closeWebSocket()
  app.exit(0)
})

crashReporter.start({
  productName: "messenger",
  companyName: "messenger-desktop",
  submitURL: "https://messenger-desktop.sp.backtrace.io:6098/post?format=minidump&token=6b041aff41e611b0cbd7c098dba17a179459092c02601691d7261944d0f5705e",
  uploadToServer: true
})

autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
  const dialogOpts = {
    type: 'info',
    buttons: ['Install', 'Later'],
    title: 'Pulse Update',
    message: releaseName,
    detail: 'A new version has been downloaded. Hit install, then re-open the app, automatically apply the update.'
  }

  try {
    dialog.showMessageBox(dialogOpts, (response) => {
      if (response === 0) {
        webSocket.closeWebSocket()
        app.exit(0)
      }
    })
  } catch (err) { }
})

autoUpdater.on('error', message => {
  console.error('There was a problem updating the app.')
  console.error(message)
})

function createWindow() {
  if (windowProvider.getWindow() === null) {
    mainWindow = windowProvider.createMainWindow()
    tray = menu.buildTray(windowProvider, webSocket)
    menu.buildMenu(windowProvider, tray, webSocket)

    openWebSocket()
  } else {
    if (process.platform === 'darwin') {
      app.dock.show()
    }

    windowProvider.getWindow().show()
    webSocket.setWindowProvider(windowProvider)
    menu.buildMenu(windowProvider, tray, webSocket)

    setTimeout(() => {
      windowProvider.getBrowserView().webContents.executeJavaScript("try { reloadUpdatedConversations() } catch (err) { }")
    }, 1000)
  }

  autoUpdater.checkForUpdates()
}

function openWebSocket() {
  if (webSocket.isWebSocketRunning()) {
    return
  }

  webSocket.openWebSocket(windowProvider, tray)
}
