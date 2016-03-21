#AB Visual Debugger

Checkout the project and run with `$ node main.js`

This listens to localhost:5000 for messages from the game server.

Mechs are represented by one of the following symbols based on their heading `↑↗→↘↓↙←↖`.

Projectiles are represented by the `⦷` symbol.

*Notes:*
* The tool is best used with a very large terminal window.
* 0,0 in the world is at the center of the terminal window.
* As mechs reach the edge of the window the view is "scaled". The larger the scale, the more "zoomed out" the camera is. The current scale can be seen in the upper left corner of the terminal.
* Due to 0,0 being the upper left corner of the terminal and not the lower left, NORTH is DOWN.
