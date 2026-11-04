const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');

// Jedna instancja aplikacji naraz (żeby dwa okna nie nadpisywały sobie danych)
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'Zamówienia perfum',
    backgroundColor: '#ECEEF3',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.loadFile(path.join(__dirname, 'src', 'index.html'));

  // Linki zewnętrzne otwieraj w przeglądarce, nie w aplikacji
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e) => e.preventDefault());

  // Po powrocie do okna (np. z przeglądarki albo okna wyboru pliku) oddaj klawiaturę stronie,
  // inaczej na Windows pola tekstowe potrafią nie przyjmować pisania
  win.on('focus', () => win.webContents.focus());
}

Menu.setApplicationMenu(null);

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
