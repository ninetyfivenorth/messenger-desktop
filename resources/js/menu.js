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

(function() {
  const { BrowserView, Menu, Tray, app } = require('electron')

  const path = require('path')
  const preferences = require('./preferences.js')
  const browserviewPreparer = require('./browserview-configurator.js')

  var buildMenu = (windowProvider, tray, webSocket) => {
    const template = [{
      label: 'Preferences',
      submenu: [{
        label: 'Notification Preferences',
        submenu: [
          { label: "Show Notifications", type: 'checkbox', checked: preferences.showNotifications(), click() {
            preferences.toggleShowNotifications() }
          },
          { label: "Play Notification Sound", type: 'checkbox', checked: preferences.notificationSounds(), click() {
            preferences.toggleNotificationSounds() }
          },
          { type: 'separator' },
          { label: "Display Sender in Notification", type: 'checkbox', checked: preferences.notificationSenderPreviews(), click() {
            preferences.toggleNotificationSenderPreviews() }
          },
          { label: "Display Message Preview in Notification", type: 'checkbox', checked: preferences.notificationMessagePreviews(), click() {
            preferences.toggleNotificationMessagePreviews() }
          },
          { type: 'separator' },
          { label: "Snooze Desktop Notifications", submenu: [
            { label: "30 mins", type: 'checkbox', checked: preferences.isSnoozeActive() && preferences.currentSnoozeSelection() == "30_mins", click() {
              preferences.snooze("30_mins") }
            },
            { label: "1 hour", type: 'checkbox', checked: preferences.isSnoozeActive() && preferences.currentSnoozeSelection() == "1_hour", click() {
              preferences.snooze("1_hour") }
            },
            { label: "3 hours", type: 'checkbox', checked: preferences.isSnoozeActive() && preferences.currentSnoozeSelection() == "3_hours", click() {
              preferences.snooze("3_hours") }
            },
            { label: "12 hours", type: 'checkbox', checked: preferences.isSnoozeActive() && preferences.currentSnoozeSelection() == "12_hours", click() {
              preferences.snooze("12_hours") }
            }
          ] }
        ]
      }, { type: 'separator' }, {
        label: process.platform === 'darwin' ? 'Show in Menu Bar' : 'Show in Tray',
        type: 'checkbox',
        checked: preferences.minimizeToTray(),
        click() {
          let toTray = !preferences.minimizeToTray()
          preferences.toggleMinimizeToTray()

          if (!toTray && tray != null) {
            tray.destroy()
          } else {
            tray = buildTray(windowProvider, webSocket)
          }
        }
      } ]
    }, {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteandmatchstyle' },
        { role: 'delete' },
        { role: 'selectall' }
      ]
    }, {
      label: 'View',
      submenu: [{
        label: 'Reload',
        accelerator: 'CmdOrCtrl+R',
        click(item, focusedWindow) {
          windowProvider.getBrowserView().webContents.loadURL('https://messenger.klinkerapps.com/')
        }
      }, {
        label: 'Toggle Developer Tools',
        accelerator: 'CmdOrCtrl+I',
        click(item, focusedWindow) {
          windowProvider.getBrowserView().webContents.toggleDevTools()
        }
      },
      { type: 'separator' },
      { role: 'resetzoom' },
      { role: 'zoomin' },
      { role: 'zoomout' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
    }, {
      role: 'window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    }, {
      role: 'help',
      submenu: [
        { label: require('electron').app.getVersion() },
        { label: 'Get Help', click() { require('electron').shell.openExternal('https://messenger.klinkerapps.com/help') } },
        { label: 'Platform Support', click() { require('electron').shell.openExternal('https://messenger.klinkerapps.com/overview') } },
        { label: 'Get it on Google Play', click() { require('electron').shell.openExternal('https://play.google.com/store/apps/details?id=xyz.klinker.messenger') } }
      ]
    }]

    if (process.platform !== "win32") {
      template[0].submenu.push({
        label: 'Show Unread Count on Icon',
        type: 'checkbox',
        checked: preferences.badgeDockIcon(),
        click() {
          let badge = !preferences.badgeDockIcon()
          preferences.toggleBadgeDockIcon()

          if (!badge) {
            require('electron').app.setBadgeCount(0)
            if (process.platform === 'darwin' && tray != null) {
              tray.setTitle("")
            }
          }
        }
      })
    }

    if (process.platform === 'darwin') {
      const name = require('electron').app.getName()
      template.unshift({
        label: name,
        submenu: [
          { type: 'separator' },
          { label: 'Hide Pulse', role: 'hide' },
          { role: 'hideothers' },
          { role: 'unhide' },
          { type: 'separator' },
          { label: 'Quit Pulse', role: 'quit' }
        ]
      })

      // Edit menu
      template[2].submenu.push(
        { type: 'separator' },
        { label: 'Speech', submenu: [
          { role: 'startspeaking' },
          { role: 'stopspeaking' }
        ]}
      )

      // Windows menu
      template[4].submenu = [
        { label: 'Close', accelerator: 'CmdOrCtrl+W', role: 'close' },
        { label: 'Minimize', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
        { label: 'Zoom', role: 'zoom' },
        { type: 'separator' },
        { label: 'Bring All to Front', role: 'front' }
      ]
    } else {
      template[0].submenu.push({
        label: 'Auto-hide Menu Bar',
        type: 'checkbox',
        checked: preferences.autoHideMenuBar(),
        click() {
          let autoHide = !preferences.autoHideMenuBar()
          preferences.toggleAutoHideMenuBar()

          windowProvider.getWindow().setAutoHideMenuBar(autoHide)
          windowProvider.getWindow().setMenuBarVisibility(!autoHide)

          browserviewPreparer.prepare(windowProvider.getWindow(), windowProvider.getBrowserView())
        }
      })
    }

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)

    // if they turn on auto hide, then this should be hidden.
    // if they turn off auto hide, we will show this menu bar immediately.
    windowProvider.getWindow().setMenuBarVisibility(!preferences.autoHideMenuBar())
    windowProvider.getWindow().setAutoHideMenuBar(preferences.autoHideMenuBar())
  }

  var buildTray = (windowProvider, webSocket) => {
    if (!preferences.minimizeToTray()) {
      return
    }

    var iconName = null
    if (process.platform === "darwin") {
      iconName = "macTemplate.png"
    } else if (process.platform === "win32") {
      iconName = "windows.ico"
    } else {
      iconName = "linux.png"
    }

    var tray = new Tray(path.resolve(__dirname, '../images/tray/' + iconName))
    if (process.platform === "darwin") {
      tray.setPressedImage(path.resolve(__dirname, '../images/tray/macHighlight.png'))
    }

    var contextMenu = Menu.buildFromTemplate([{
      label: 'Show Pulse',
      click: () => {
        showWindow(windowProvider)
      }
    }, {
      label: 'Quit',
      accelerator: 'Command+Q',
      click: () => {
        webSocket.closeWebSocket()
        app.exit(0)
      }
    }])
    tray.setToolTip('Pulse SMS')
    tray.setContextMenu(contextMenu)

    tray.on('click', () => {
      showWindow(windowProvider)
    })

    return tray
  }

  function showWindow(windowProvider) {
    if (windowProvider.getWindow() != null) {
      windowProvider.getWindow().show()
      if (process.platform === 'darwin') {
        app.dock.show()
      }

      setTimeout(() => {
        windowProvider.getBrowserView().webContents.executeJavaScript("try { reloadUpdatedConversations() } catch (err) { }")
      }, 1000)
    } else {
      windowProvider.createMainWindow()
    }
  }

  module.exports.buildMenu = buildMenu
  module.exports.buildTray = buildTray
}())
