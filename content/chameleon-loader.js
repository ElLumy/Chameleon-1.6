// content/chameleon-loader.js
// Este script carga todos los módulos de Chameleon en orden
(function() {
  'use strict';
  
  console.log('[Chameleon Loader] Starting module loading...');
  
  // Obtener el ID del canal de comunicación
  const currentScript = document.currentScript;
  const channelId = currentScript?.getAttribute('data-channel-id');
  
  if (!channelId || !window[channelId]) {
    console.error('[Chameleon Loader] No initialization data found');
    return;
  }
  
  // Obtener datos de inicialización
  const initData = window[channelId];
  const sessionSeed = initData.sessionSeed;
  const extensionId = initData.extensionId;
  
  console.log('[Chameleon Loader] Using session seed:', sessionSeed.substring(0, 8) + '...');
  
  // Lista de módulos a cargar en orden
  const modules = [
    'lib/seedrandom.min.js',
    'content/modules/utils/jitter.js',
    'content/modules/interceptors/meta-proxy.js',
    'content/modules/interceptors/navigator.js',
    'content/modules/interceptors/screen.js',
    'content/modules/interceptors/canvas.js',
    'content/modules/interceptors/webgl.js',
    'content/modules/interceptors/audio.js',
    'content/modules/interceptors/timezone.js'
  ];
  
  let loadedModules = 0;
  
  // Función para cargar un módulo
  function loadModule(modulePath, callback) {
    const script = document.createElement('script');
    script.src = `chrome-extension://${extensionId}/${modulePath}`;
    script.async = false;
    
    script.onload = () => {
      loadedModules++;
      console.log(`[Chameleon Loader] Loaded module ${loadedModules}/${modules.length}: ${modulePath}`);
      if (callback) callback();
    };
    
    script.onerror = (error) => {
      console.error(`[Chameleon Loader] Failed to load module: ${modulePath}`, error);
      if (callback) callback(error);
    };
    
    document.head.appendChild(script);
  }
  
  // Función para cargar profiles.json
  async function loadProfilesData() {
    try {
      const response = await fetch(`chrome-extension://${extensionId}/data/profiles.json`);
      if (!response.ok) {
        throw new Error('Failed to load profiles data');
      }
      return await response.json();
    } catch (error) {
      console.error('[Chameleon Loader] Failed to load profiles data:', error);
      return null;
    }
  }
  
  // Cargar módulos secuencialmente
  function loadModulesSequentially(index = 0) {
    if (index >= modules.length) {
      // Todos los módulos cargados, inicializar Chameleon
      initializeChameleon();
      return;
    }
    
    loadModule(modules[index], (error) => {
      if (!error) {
        loadModulesSequentially(index + 1);
      } else {
        console.error('[Chameleon Loader] Module loading stopped due to error');
      }
    });
  }
  
  // Inicializar Chameleon principal
  async function initializeChameleon() {
    console.log('[Chameleon Loader] All modules loaded, initializing main...');
    
    try {
      // Cargar datos de perfiles
      const profilesData = await loadProfilesData();
      if (!profilesData) {
        throw new Error('Profiles data not available');
      }
      
      // Establecer datos globales para chameleon-main
      window.__chameleonInitData = {
        profilesData: profilesData,
        sessionSeed: sessionSeed
      };
      
      // Cargar y ejecutar chameleon-main.js
      loadModule('content/chameleon-main.js', (error) => {
        if (error) {
          console.error('[Chameleon Loader] Failed to load main module:', error);
        } else {
          console.log('[Chameleon Loader] Chameleon fully loaded and initialized');
          
          // Limpiar datos de inicialización después de un tiempo
          setTimeout(() => {
            delete window[channelId];
          }, 1000);
        }
      });
      
    } catch (error) {
      console.error('[Chameleon Loader] Initialization error:', error);
    }
  }
  
  // Iniciar carga de módulos
  loadModulesSequentially();
  
})();