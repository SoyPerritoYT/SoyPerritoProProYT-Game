# SoyPerrito: Mundo de Bloques

Un juego de navegador de construcción por bloques protagonizado por SoyPerrito. Explora el mundo, pica tierra y usa los bloques que recojas para construir.

## Jugar en ordenador, móvil o TV

Para abrirlo localmente (incluye el servidor multijugador), ejecuta:

```bash
npm start
```

Después abre `http://localhost:4173` en el navegador. También puedes abrir directamente `index.html`.

| Dispositivo | Control |
| --- | --- |
| Ordenador | **←/→** mueve, **Enter/Espacio** salta, **↓** pica y **↑** coloca |
| Móvil/tablet | Botones grandes en pantalla |
| Smart TV | **←/→** mueve, **OK** salta, **↓** pica y **↑** coloca |
| PlayStation (navegador) | **Stick/cruceta** mueve, **✕** salta, **↓** pica, **↑/○** coloca y **Options** pausa |

En una TV, abre la dirección del equipo que sirve el juego (por ejemplo, `http://192.168.1.20:4173`) desde el navegador de la TV. La interfaz se amplía automáticamente en pantallas grandes y permite navegación con el mando.

### PlayStation

El juego se ejecuta desde el navegador de la consola: no es una descarga de PSN ni una aplicación nativa. Con la PlayStation y el ordenador que ejecuta `npm start` conectados a la misma red, abre la dirección LAN del ordenador (por ejemplo, `http://192.168.1.20:4173`) en el navegador de PlayStation. El botón **PANTALLA TV/PS** solicita pantalla completa cuando el navegador de la consola lo permite. Si el navegador no expone el mando mediante Gamepad API, los botones grandes en pantalla siguen siendo un control alternativo navegable con el mando.

## Jugar con amigos y skins

1. Ejecuta `npm start` en un ordenador de la misma red que tus amigos.
2. Todos deben abrir la dirección de ese ordenador en el navegador (por ejemplo, `http://192.168.1.20:4173`).
3. Pulsa **AMIGOS**, escribe un código de sala o deja el campo vacío para generar uno y compártelo.
4. Elige una de las **ocho skins gratuitas originales** de SoyPerrito o importa una imagen propia de hasta 250 KB. Las skins importadas permanecen solamente en tu navegador.

Los jugadores de la misma sala se ven en tiempo real y las acciones de picar o colocar bloques se comparten con la sala mientras el servidor esté activo.

Puedes pausar durante una partida con **P**, **Escape/Volver**, o el botón **Start** del mando. También se admiten mandos conectados: cruceta/joystick para moverse, **A** para saltar, **abajo** para picar y **B** para colocar.
