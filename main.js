var THREE = require("three");
var AXEL = require("axel");
var TOOLS = require("./tools/tools.js");

var mech_brushes = "↑↗→↘↓↙←↖";
var projectile_brushes = "⦷";
var color_brushes = " ░▒▓█";

var mechs = {};
var projectiles = {};

var error = false;

AXEL.clear();

var assign_hooks = function() {
  TOOLS.on_spawn_message_received = function(ServerClientObjectSpawnMessage) {
    if(ServerClientObjectSpawnMessage.objectType == TOOLS.OBJECT_TYPES.Mech){
      mechs[ServerClientObjectSpawnMessage.objectId] = { position: normalize(ServerClientObjectSpawnMessage.position), rotation: ServerClientObjectSpawnMessage.rotation };
    }    
    if(ServerClientObjectSpawnMessage.objectType == TOOLS.OBJECT_TYPES.Projectile){
      projectiles[ServerClientObjectSpawnMessage.objectId] = { position: normalize(ServerClientObjectSpawnMessage.position), rotation: ServerClientObjectSpawnMessage.rotation };
    }    
    render();
  };
  TOOLS.on_move_message_received = function(ServerClientObjectMoveMessage) {
    if(mechs[ServerClientObjectMoveMessage.objectId]){
      mechs[ServerClientObjectMoveMessage.objectId].position = normalize(ServerClientObjectMoveMessage.position);
      mechs[ServerClientObjectMoveMessage.objectId].rotation = ServerClientObjectMoveMessage.rotation;
    } else if(projectiles[ServerClientObjectMoveMessage.objectId]){
      projectiles[ServerClientObjectMoveMessage.objectId].position = normalize(ServerClientObjectMoveMessage.position);
      projectiles[ServerClientObjectMoveMessage.objectId].rotation = ServerClientObjectMoveMessage.rotation;
    }
    render();
  };
  TOOLS.on_destroy_message_received = function(ServerClientObjectDestroyMessage) {
    if(mechs[ServerClientObjectDestroyMessage.objectId]) {
      delete mechs[ServerClientObjectDestroyMessage.objectId];
    } else if(projectiles[ServerClientObjectDestroyMessage.objectId]){
      delete projectiles[ServerClientObjectDestroyMessage.objectId];
    } else {
      error = true;
      throw "Object Type: " + ServerClientObjectDestroyMessage.objectId + " NOT FOUND IN ANY LIST";
    }
    render();
  };

  TOOLS.on_game_phase_end = function(){
    mechs = {};
    projectiles = {};
    scale = 1.0;
    error = false;
    render();
  }
}

/* Spawn Ring has 100 unit radius */
var scale = 1.0;
var xOffset = AXEL.cols / 2;
var zOffset = AXEL.rows / 2;
function normalize(position){  
  var ret = {
    x: (position.x / scale) + xOffset,
    y: position.y / scale,
    z: (position.z / scale) + zOffset
  };
  while(ret.x < 0 || ret.x > AXEL.cols || ret.z < 0 || ret.z > AXEL.rows){
    scale += 1.0;
    ret = {
      x: (position.x / scale) + xOffset,
      y: position.y / scale,
      z: (position.z / scale) + zOffset
    };
  }
  return ret;
}

function render(){
  if(error)
    return;

  AXEL.clear();
  AXEL.text(0, 0, "Scale: " + scale);
  for(var propertyName in mechs) {    
    var vector = new THREE.Vector3( 0, 0, 1 );
    vector.applyQuaternion(new THREE.Quaternion(mechs[propertyName].rotation.x, mechs[propertyName].rotation.y, mechs[propertyName].rotation.z, mechs[propertyName].rotation.w));    
    if(vector.x > -0.2 && vector.x < 0.2){
      if(vector.z > 0){ // Up
        AXEL.brush = mech_brushes[4];  
      } else { // Down
        AXEL.brush = mech_brushes[0];
      }
    } else if(vector.x > -0.8 && vector.x <= -0.2){
      if(vector.z > 0){ // Diag Left Up
        AXEL.brush = mech_brushes[5];  
      } else { // Diag Left Down
        AXEL.brush = mech_brushes[7];
      }
    } else if(vector.x < 0.8 && vector.x >= 0.2){
      if(vector.z > 0){ // Diag Right Up
        AXEL.brush = mech_brushes[3];  
      } else { // Diag Right Down
        AXEL.brush = mech_brushes[1];
      }
    } else if(vector.x <= -0.8){
      AXEL.brush = mech_brushes[6]; // Left
    } else if(vector.x >= 0.8){
      AXEL.brush = mech_brushes[2]; // Right
    }

    AXEL.fg(0, 128, 128)    
    AXEL.point(mechs[propertyName].position.x, mechs[propertyName].position.z);
  }

  for(var propertyName in projectiles) {        
    AXEL.brush = projectile_brushes[0];  
    AXEL.fg(128, 128, 0)    
    AXEL.point(projectiles[propertyName].position.x, projectiles[propertyName].position.z);
  }

  AXEL.cursor.restore();
}

var rad2deg = function(f){
  return Math.floor((f*100) * (180/Math.PI))/100;
}

assign_hooks();

TOOLS.connect(5000, '127.0.0.1');
