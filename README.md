# Caparazón Digital Twin — Web

Versión interactiva para navegador construida **a partir del FBX del proyecto Unity original**. No es un build del Editor de Unity. Conserva el modelo del caparazón, controles Power / Volume + / Volume − / Mic, estados OFF / ON_LISTENING / ON_MUTED, indicadores, dashboard, tonos de feedback y registro CSV local.

**Abrir:** https://younshi.github.io/Tortuga/ (pendiente de publicación y prueba).

**Proyecto fuente de referencia:** Unity 6000.3.15f1, escena `Assets/Scenes/Caparazon_DigitalTwin.unity`, modelo `Assets/Models/caparazon.fbx` (SHA-256 `e8c52b20721b22b450b17e3ae15a0d16cf6ca3ab8312ae25b9bbd33a7c2ba825`). La geometría se convirtió desde ese FBX a glTF y se optimizó para Web; el control de estado reproduce el comportamiento de los scripts de Unity. El CSV se guarda en IndexedDB de este navegador y se descarga desde el botón del dashboard; no se envía a un servidor.

La raíz del repositorio y `docs/` contienen la misma versión estática publicable; Pages puede usar `main` con `/(root)` o `/docs`.

El código fuente Web está en `web-source/`. Para desarrollarlo: `cd web-source`, `npm install`, `npm run dev`; para reconstruirlo: `npm run build`. El resultado queda en `web-source/dist/` y debe copiarse a la carpeta que Pages publica. No se necesita Unity para reconstruir esta versión Web.

## Diferencias de la implementación Web

El render y las interacciones están escritos con Three.js en lugar del runtime Unity. La geometría Web se simplificó con una tolerancia visual del 0,2 % del radio del modelo y se comprimió con Meshopt. Los tonos originales se conservaron como WAV. El almacenamiento usa IndexedDB en vez del sistema de archivos virtual de Unity, y hay un botón para descargar el CSV. En dispositivos táctiles se ofrece además una fila de controles accesibles. La equivalencia visual exacta con el Editor Unity no está comprobada.
