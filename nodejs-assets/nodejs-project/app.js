const rn_bridge = require('rn-bridge');
const fs_promises = require('fs').promises;
const fs = require('fs');
const path = require('path');
const util = require('util');

// --- Centralized Logging Configuration ---
const LOGS_DIR = path.join(__dirname, 'logs');
let isFileLoggingEnabled = true; // Default to enabled, can be toggled from UI

// --- Setup Logging Infrastructure ---
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR);
}

/**
 * Creates a dedicated logger for a specific project.
 * @param {string} projectName - The name of the project, used for the log filename.
 */
const createLogger = (projectName) => {
  const logFilePath = path.join(LOGS_DIR, `${projectName}.log`);
  // Clear the project's log file on creation of the logger instance
  fs.writeFileSync(logFilePath, '');

  const logToFile = (level, ...args) => {
    if (isFileLoggingEnabled) {
      const message = util.format(...args);
      const logMessage = `[${level}] ${new Date().toISOString()}: ${message}\n`;
      fs_promises.appendFile(logFilePath, logMessage)
        .catch(err => {
          // Fallback to console if file logging fails
          console.error(`File logging to ${logFilePath} failed:`, err);
        });
    }
  };

  return {
    log: (...args) => {
      console.log(...args); // Keep native console output
      logToFile('LOG', ...args);
    },
    error: (...args) => {
      console.error(...args); // Keep native console output
      logToFile('ERROR', ...args);
    },
  };
};

const mainLogger = createLogger('main'); // Logger for app.js itself

// --- Global Error Catcher ---
process.on('uncaughtException', (err, origin) => {
  mainLogger.error(`NODE_JS_CRASH: [${origin}] ${err.stack || err.toString()}`);
});

// --- Main Application Logic ---
const loadedProjects = {};

// --- Central Message Listener ---
rn_bridge.channel.addListener('message', async (msg) => {
  try {
    const action = JSON.parse(msg);
    const projectName = action.payload?.projectName;

    const restartProject = async (name) => {
      if (name && loadedProjects[name]) {
          mainLogger.log(`Restarting project '${name}'...`);
          const project = loadedProjects[name];
          project.module.stopService?.();
          // Invalidate the require cache for the project's main file
          delete require.cache[require.resolve(project.mainFile)];
          // Re-require the module
          const newModule = require(project.mainFile);
          if (newModule.init) newModule.init(createLogger(name));
          project.module = newModule;
          newModule.startService?.();
          mainLogger.log(`Project '${name}' restarted successfully.`);
      }
    };
    switch(action.type) {

      case 'INSTALL_PACKAGE': {
        const { packageName } = action.payload;
        if (!projectName || !packageName) return;

        const projectPath = path.join(__dirname, 'projects', projectName);
        rn_bridge.channel.send(JSON.stringify({ type: 'NPM_LOG', payload: `Installing '${packageName}' into '${projectName}'...` }));
        
        try {
            // Using libnpm.install to programmatically install the package
            await libnpm.install([packageName], {
                path: projectPath,
                // Pipe output to our logger/bridge
                log: {
                    info: (...args) => rn_bridge.channel.send(JSON.stringify({ type: 'NPM_LOG', payload: util.format(...args) })),
                    warn: (...args) => rn_bridge.channel.send(JSON.stringify({ type: 'NPM_LOG', payload: `WARN: ${util.format(...args)}` })),
                    error: (...args) => rn_bridge.channel.send(JSON.stringify({ type: 'NPM_LOG', payload: `ERROR: ${util.format(...args)}` })),
                }
            });
            rn_bridge.channel.send(JSON.stringify({ type: 'NPM_INSTALL_SUCCESS', payload: `'${packageName}' installed successfully. Restarting service...` }));
            await restartProject(projectName); // Restart service to load the new module
        } catch (e) {
            rn_bridge.channel.send(JSON.stringify({ type: 'NPM_INSTALL_FAILURE', payload: e.message }));
        }
        break;
      }
      
      case 'GET_PACKAGE_JSON': {
        if (!projectName) return;
        const pkgJsonPath = path.join(__dirname, 'projects', projectName, 'package.json');
        try {
            const data = await fs_promises.readFile(pkgJsonPath, 'utf8');
            rn_bridge.channel.send(JSON.stringify({ type: 'PACKAGE_JSON_RESPONSE', payload: data }));
        } catch (e) {
            rn_bridge.channel.send(JSON.stringify({ type: 'PACKAGE_JSON_RESPONSE', payload: `Could not read package.json for ${projectName}: ${e.message}` }));
        }
        break;
      }

      case 'UPDATE_PACKAGE_JSON': {
        if (!projectName) return;
        const { code } = action.payload;
        const pkgJsonPath = path.join(__dirname, 'projects', projectName, 'package.json');
        try {
            await fs_promises.writeFile(pkgJsonPath, code);
            rn_bridge.channel.send(JSON.stringify({ type: 'CODE_UPDATE_SUCCESS' })); // Re-use this message type
            await restartProject(projectName);
        } catch (e) {
            rn_bridge.channel.send(JSON.stringify({ type: 'PROJECT_RELOAD_FAILURE', payload: e.message }));
        }
        break;
      }

      case 'DEV_HOT_RELOAD_UPDATE':
        const { path: relativePath, content } = action.payload;
        const fullPath = path.join(__dirname, relativePath);

        try {
          await fs_promises.writeFile(fullPath, content);
          
          if (relativePath === 'app.js') {
            mainLogger.error('app.js was updated. A full app restart is needed to apply changes to the main loader.');
          } else if (relativePath.startsWith('projects/')) {
            const projectToRestart = relativePath.split('/')[1];
            if (loadedProjects[projectToRestart]) {
              mainLogger.log(`[NODE-HMR] Hot-reloading project: ${projectToRestart}`);
              
              const project = loadedProjects[projectToRestart];
              project.module.stopService?.();
              
              delete require.cache[require.resolve(project.mainFile)];
              
              const newModule = require(project.mainFile);
              if (newModule.init) {
                newModule.init(createLogger(projectToRestart));
              }
              project.module = newModule;
              newModule.startService?.();
              mainLogger.log(`[NODE-HMR] Project '${projectToRestart}' reloaded successfully.`);
            }
          }
        } catch (e) {
            mainLogger.error(`[NODE-HMR] Hot-reload for ${relativePath} failed:`, e);
        }
        break;
      // --- END OF NEW CASE ---
        
      case 'SET_LOGGING_CONFIG':
        isFileLoggingEnabled = !!action.payload.enabled;
        mainLogger.log(`File logging has been ${isFileLoggingEnabled ? 'ENABLED' : 'DISABLED'}.`);
        break;

      case 'GET_LOGS':
        const projectToLog = projectName || 'main'; // Default to main log if not specified
        const logFileToRead = path.join(LOGS_DIR, `${projectToLog}.log`);
        try {
            const logData = await fs_promises.readFile(logFileToRead, 'utf8');
            rn_bridge.channel.send(JSON.stringify({ type: 'LOGS_UPDATE', payload: logData, projectName: projectToLog }));
        } catch (e) {
            rn_bridge.channel.send(JSON.stringify({ type: 'LOGS_UPDATE', payload: `Log files for '${projectToLog}' is empty or not found.`, projectName: projectToLog }));
        }
        break;
      
      // --- Service Lifecycle Cases (Unchanged) ---
      case 'START_SERVICE':
        if (projectName && loadedProjects[projectName]) loadedProjects[projectName].module.startService();
        break;
      case 'STOP_SERVICE':
        if (projectName && loadedProjects[projectName]) loadedProjects[projectName].module.stopService();
        break;
      case 'RESTART_SERVICE':
        await restartProject(projectName);
        break;
      case 'GET_SOURCE_CODE':
        if (projectName && loadedProjects[projectName]) {
          const code = await fs_promises.readFile(loadedProjects[projectName].mainFile, 'utf8');
          rn_bridge.channel.send(JSON.stringify({ type: 'SOURCE_CODE_RESPONSE', payload: code }));
        }
        break;
      case 'UPDATE_SOURCE_CODE':
        if (projectName && loadedProjects[projectName]) {
          const project = loadedProjects[projectName];
          const { code } = action.payload;
          try {
            await fs_promises.writeFile(project.mainFile, code);
            project.module.stopService?.();
            delete require.cache[require.resolve(project.mainFile)];
            const newModule = require(project.mainFile);
            if (newModule.init) newModule.init(createLogger(projectName));
            project.module = newModule;
            newModule.startService?.();
            rn_bridge.channel.send(JSON.stringify({ type: 'PROJECT_RELOAD_SUCCESS' }));
          } catch (e) {
            mainLogger.error('Hot reload failed:', e);
            rn_bridge.channel.send(JSON.stringify({ type: 'PROJECT_RELOAD_FAILURE', payload: e.message }));
          }
        }
        break;

      // --- Default Case (Unchanged) ---
      default:
        if (projectName && loadedProjects[projectName] && loadedProjects[projectName].module.handleMessage) {
          loadedProjects[projectName].module.handleMessage(action);
        } else if (action.type === 'GET_FRESH_DATA') {
           Object.values(loadedProjects).forEach(p => p.module.handleMessage?.(action));
        }
        break;
    }
  } catch(e) { /* Ignore non-JSON messages */ }
});

// --- Dynamic Project Loader ---
(async () => {
  const projectFolders = fs.readdirSync(path.join(__dirname, 'projects'), { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const folderName of projectFolders) {
    // A dedicated logger for this project is created regardless of success or failure.
    // This ensures the log file is always created and cleared on startup.
    const projectLogger = createLogger(folderName);
    const mainFile = path.join(__dirname, 'projects', folderName, 'index.js');
    
    try {
      if (fs.existsSync(mainFile)) {
        mainLogger.log(`Loading project: ${folderName}`);
        const projectModule = require(mainFile);

        // Inject the project-specific logger into the module
        if (projectModule.init) {
          projectModule.init(projectLogger);
        }

        loadedProjects[folderName] = { module: projectModule, mainFile };
        
        if (projectModule.startService) {
          projectModule.startService();
        }
      }
    } catch (err) {
      // *** THE FIX IS HERE ***
      // If loading fails, use the specific project's logger to report the error.
      const errorMessage = `FATAL: Project '${folderName}' failed to load.\n${err.stack || err.toString()}`;
      projectLogger.error(errorMessage);
      // Also log to the main logger so we know a project failed from a central place too.
      mainLogger.error(`Project loader failed for '${folderName}'. See '${folderName}.log' for details.`);
    }
  }
})();
